export type DreamSearchIssue = 'rate_limited' | 'unauthorized' | 'timeout' | 'provider_error';

/** Serializable provider failure, shared without importing a server module in UI. */
export class DreamSearchError extends Error {
  constructor(public code: DreamSearchIssue, public retryAfterSeconds = 0) {
    super(dreamSearchMessage(code, false));
    this.name = 'DreamSearchError';
  }
}

export function dreamSearchMessage(issue: DreamSearchIssue | null, hasResults: boolean): string {
  if (issue === 'rate_limited') return hasResults
    ? 'A busca atingiu o limite temporário. Você pode avaliar as fotos já encontradas; novas buscas precisam aguardar.'
    : 'A busca atingiu o limite temporário do serviço. Aguarde antes de pesquisar novamente.';
  if (issue === 'unauthorized') return 'O serviço de pesquisa está indisponível neste servidor. Tente novamente mais tarde.';
  if (issue === 'timeout') return hasResults
    ? 'A pesquisa demorou além do esperado. Mostramos as fotos encontradas até agora.'
    : 'A pesquisa demorou além do esperado. Tente novamente daqui a pouco.';
  if (issue) return hasResults
    ? 'Parte da pesquisa ficou indisponível. Mostramos as fotos encontradas até agora.'
    : 'Não foi possível consultar as publicações agora. Tente novamente mais tarde.';
  return hasResults ? '' : 'Não encontramos fotografias públicas acessíveis para esse lugar agora. Tente outro nome ou a região mais próxima.';
}
