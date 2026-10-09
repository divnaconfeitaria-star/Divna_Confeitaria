/* Marca que o JavaScript está ativo (usado nas animações de entrada).
   Fica num arquivo separado, e não escrito dentro do HTML, porque a regra de segurança
   do site (vercel.json) só aceita scripts que vêm de arquivos do próprio site. */
document.documentElement.classList.add("js");
