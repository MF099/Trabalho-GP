import React from "react";
import { ChevronDown } from "lucide-react";

/**
 * Bloco recolhível para detalhes técnicos.
 * A visão gerencial mostra só o essencial; os números de apoio ficam aqui
 * para a arguição e para conferir com o caderno manuscrito.
 */
export const Detalhes: React.FC<{
  titulo?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ titulo = "Ver detalhes", children, className = "" }) => (
  <details className={`group ${className}`}>
    <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-slate-400 select-none hover:text-slate-200 [&::-webkit-details-marker]:hidden">
      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
      {titulo}
    </summary>
    <div className="mt-3">{children}</div>
  </details>
);

/** Título de seção com uma frase curta explicando do que se trata. */
export const Cabecalho: React.FC<{ titulo: string; descricao?: string; children?: React.ReactNode }> = ({
  titulo,
  descricao,
  children,
}) => (
  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
    <div>
      <h3 className="text-sm font-semibold text-white">{titulo}</h3>
      {descricao && <p className="mt-0.5 text-xs text-slate-400">{descricao}</p>}
    </div>
    {children}
  </div>
);
