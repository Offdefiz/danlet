import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DuetMusic } from "@/components/duet-music";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Row } from "@/lib/duet.types";

const { databaseFetch, successToast, errorToast } = vi.hoisted(() => ({
  databaseFetch: vi.fn<typeof fetch>(),
  successToast: vi.fn(),
  errorToast: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", async () => {
  const { createClient } = await import("@supabase/supabase-js");
  return {
    supabase: createClient<Database>("https://duet-test.invalid", "test-key", {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: databaseFetch },
    }),
  };
});

vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/duet.functions", () => ({ findMusic: vi.fn() }));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: successToast, error: errorToast }),
}));

const userId = "11111111-1111-4111-8111-111111111111";
const song: Row<"records"> = {
  id: "22222222-2222-4222-8222-222222222222",
  kind: "music",
  title: "Nossa primeira música",
  body: "https://www.youtube.com/watch?v=first",
  period: "Entrada da noiva",
  done: false,
  version: 1,
  reference_id: null,
  created_by: userId,
  updated_by: userId,
  created_at: "2026-10-20T12:00:00Z",
  updated_at: "2026-10-20T12:00:00Z",
};
const otherSong = {
  ...song,
  id: "33333333-3333-4333-8333-333333333333",
  title: "A música que deve ficar",
};
let serverRecords: Row<"records">[];
const clients: QueryClient[] = [];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const respond: typeof fetch = async (input, options) => {
  const url = new URL(String(input));
  if (options?.method === "DELETE") {
    const id = url.searchParams.get("id")?.replace(/^eq\./, "");
    const deleted = serverRecords.filter((record) => record.id === id);
    serverRecords = serverRecords.filter((record) => record.id !== id);
    return jsonResponse(deleted.map((record) => ({ id: record.id })));
  }
  return jsonResponse(serverRecords);
};

function renderMusic() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  clients.push(client);
  function MusicScreen() {
    const { data } = useQuery({
      queryKey: ["duet", userId],
      queryFn: async () => {
        const result = await supabase.from("records").select("*");
        if (result.error) throw result.error;
        return { records: result.data ?? [] };
      },
      initialData: { records: [...serverRecords] },
    });
    return <DuetMusic records={data.records} userId={userId} />;
  }
  render(
    <QueryClientProvider client={client}>
      <MusicScreen />
    </QueryClientProvider>,
  );
  return screen.getAllByRole("button", { name: /remover/i })[0]!;
}

beforeEach(() => {
  serverRecords = [song, otherSong];
  databaseFetch.mockReset().mockImplementation(respond);
  successToast.mockReset();
  errorToast.mockReset();
});

afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
});

describe("Wedding music removal", () => {
  it("deletes only the selected song and updates the list without a realtime event", async () => {
    fireEvent.click(renderMusic());

    await waitFor(() =>
      expect(screen.queryByRole("link", { name: song.title })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: otherSong.title })).toBeInTheDocument();
    expect(serverRecords.map((record) => record.id)).toEqual([otherSong.id]);
    const request = databaseFetch.mock.calls.find(([, options]) => options?.method === "DELETE");
    expect(request).toBeDefined();
    const url = new URL(String(request![0]));
    expect(url.searchParams.get("id")).toBe(`eq.${song.id}`);
    expect(url.searchParams.get("kind")).toBe("eq.music");
    expect(successToast).toHaveBeenCalled();
    expect(errorToast).not.toHaveBeenCalled();
  });

  it("keeps the song and reports a failed deletion", async () => {
    databaseFetch.mockImplementation((input, options) =>
      options?.method === "DELETE"
        ? Promise.resolve(jsonResponse({ message: "Permission denied", code: "42501" }, 403))
        : respond(input, options),
    );
    const remove = renderMusic();
    fireEvent.click(remove);

    await waitFor(() => expect(errorToast).toHaveBeenCalled());
    expect(screen.getByRole("link", { name: song.title })).toBeInTheDocument();
    expect(successToast).not.toHaveBeenCalled();
    await waitFor(() => expect(remove).toBeEnabled());
  });

  it("does not claim success when the database deletes no rows", async () => {
    databaseFetch.mockImplementation((input, options) =>
      options?.method === "DELETE" ? Promise.resolve(jsonResponse([])) : respond(input, options),
    );
    fireEvent.click(renderMusic());

    await waitFor(() => expect(errorToast).toHaveBeenCalled());
    expect(screen.getByRole("link", { name: song.title })).toBeInTheDocument();
    expect(successToast).not.toHaveBeenCalled();
  });

  it("prevents repeated clicks while the deletion is pending", async () => {
    let finishDelete!: (response: Response) => void;
    const pendingDelete = new Promise<Response>((resolve) => {
      finishDelete = resolve;
    });
    databaseFetch.mockImplementation((input, options) =>
      options?.method === "DELETE" ? pendingDelete : respond(input, options),
    );
    const remove = renderMusic();
    fireEvent.click(remove);

    await waitFor(() => expect(remove).toBeDisabled());
    await waitFor(() => expect(databaseFetch).toHaveBeenCalledTimes(1));
    fireEvent.click(remove);
    expect(databaseFetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: song.title })).toBeInTheDocument();

    serverRecords = [otherSong];
    finishDelete(jsonResponse([{ id: song.id }]));
    await waitFor(() =>
      expect(screen.queryByRole("link", { name: song.title })).not.toBeInTheDocument(),
    );
  });
});
