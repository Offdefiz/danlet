/** Wedding ideas need higher resolution than tiny profile avatars, but
 * should not require sending multi-megabyte iPhone originals over mobile data. */
export async function optimizeDreamPhoto(file: File): Promise<File> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
    throw new Error('Use JPG, PNG ou WebP. No iPhone, salve uma imagem compatível primeiro.');
  }
  if (file.size > 12 * 1024 * 1024) throw new Error('A imagem deve ter até 12 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve,reject)=>{
      if (img.complete && img.naturalWidth>0) return resolve();
      img.onload=()=>resolve(); img.onerror=()=>reject(new Error('Não consegui abrir essa fotografia.'));
    });
    const size = Math.min(1, 1400 / Math.max(img.naturalWidth,img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth*size);
    canvas.height = Math.round(img.naturalHeight*size);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não consegui preparar a imagem neste aparelho.');
    context.drawImage(img,0,0,canvas.width,canvas.height);
    const blob = await new Promise<Blob | null>(resolve=>canvas.toBlob(resolve,'image/jpeg',0.87));
    if (!blob) throw new Error('Falha na otimização da imagem.');
    return new File([blob],'dream-photo.jpg',{type:'image/jpeg',lastModified:Date.now()});
  } finally { URL.revokeObjectURL(url); }
}
