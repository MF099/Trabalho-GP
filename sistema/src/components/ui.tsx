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

/**
 * Liga um gráfico Recharts a uma tabela: passar o mouse num ponto do gráfico destaca a linha,
 * e passar o mouse na linha marca o ponto no gráfico (via <ReferenceLine x={ativoX} />).
 */
export function useLigacaoGrafico<T extends Record<string, unknown>>(dados: T[], chaveX: keyof T) {
  const [ativo, setAtivo] = React.useState<number | null>(null);
  const chartProps = {
    onMouseMove: (s: { activeTooltipIndex?: number } | null) => {
      const i = s?.activeTooltipIndex;
      setAtivo(typeof i === "number" ? i : null);
    },
    onMouseLeave: () => setAtivo(null),
  };
  const ativoX = ativo !== null && dados[ativo] ? (dados[ativo][chaveX] as string | number) : undefined;
  return { ativo, setAtivo, chartProps, ativoX };
}

export interface ColunaTabela<T> {
  titulo: string;
  valor: (linha: T) => React.ReactNode;
  direita?: boolean;
  cor?: string;
}

/** Tabela com os mesmos números do gráfico ao lado, destacando a linha ligada ao ponto ativo. */
export function TabelaDoGrafico<T>({
  dados,
  colunas,
  ativo,
  onAtivo,
  alturaMax = "max-h-60",
}: {
  dados: T[];
  colunas: ColunaTabela<T>[];
  ativo: number | null;
  onAtivo: (i: number | null) => void;
  alturaMax?: string;
}) {
  return (
    <div className={`${alturaMax} overflow-auto`}>
      <table className="text-left text-xs">
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c.titulo} className={c.direita ? "text-right" : ""}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody onMouseLeave={() => onAtivo(null)}>
          {dados.map((linha, i) => (
            <tr key={i} onMouseEnter={() => onAtivo(i)} className={`cursor-default ${ativo === i ? "linha-ativa" : ""}`}>
              {colunas.map((c) => (
                <td key={c.titulo} className={`font-mono ${c.direita ? "text-right" : ""} ${c.cor ?? "text-slate-200"}`}>
                  {c.valor(linha)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
