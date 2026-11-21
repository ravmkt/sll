export const SLL_LOGO_HEIGHT = 30;

type SllLogoProps = { src: string; alt: string; className?: string };

/** Logo padrao SLL: altura fixa de 30px, largura automatica, alinhado a esquerda. */
export function SllLogo({ src, alt, className = "" }: SllLogoProps) {
  return (
    <img
      src={src}
      alt={alt}
      style={{ height: SLL_LOGO_HEIGHT, width: "auto" }}
      className={`max-w-none shrink-0 object-contain object-left ${className}`}
    />
  );
}