// Minúsculas y sin acentos para que "jardin" encuentre "Jardín"
export const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
