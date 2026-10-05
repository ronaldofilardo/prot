import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UploadProtheusPullSection } from "../UploadProtheusPullSection";
import { UploadDropzoneSection } from "../UploadDropzoneSection";
import { UploadPanel } from "../UploadPanel";
import type { PullEntityResult } from "@/hooks/useUploadPanel";

const fetchMock = vi.fn();

const propsDropzone = {
  files: [] as File[],
  uploading: false,
  results: null as PullEntityResult[] | null,
  error: null as string | null,
  onDrop: vi.fn(),
  onFileInput: vi.fn(),
  onRemoveFile: vi.fn(),
  onUpload: vi.fn(),
};

const pullOk: PullEntityResult = {
  arquivo: "sf2.csv",
  entidade: "SF2",
  registros: 5,
  sync: { entidade: "SF2", processados: 5, criados: 5, atualizados: 2, erros: 0 },
};

const pullAviso: PullEntityResult = {
  arquivo: "sa1.csv",
  entidade: "SA1",
  registros: 3,
  sync: { entidade: "SA1", processados: 3, criados: 0, atualizados: 3, erros: 1 },
};

const pullFalha: PullEntityResult = {
  arquivo: "se1.csv",
  entidade: "SE1",
  registros: 0,
  sync: { entidade: "SE1", processados: 0, criados: 0, atualizados: 0, erros: 0 },
  erro: "Timeout na API",
};

describe("UploadProtheusPullSection", () => {
  it("ocioso mostra o botao de busca e sem erro ou resultados", () => {
    render(<UploadProtheusPullSection pulling={false} pullResults={null} pullError={null} onPull={vi.fn()} />);

    expect(screen.getByText("Buscar no Protheus")).toBeInTheDocument();
    expect(screen.queryByText(/Sincroniza..o Protheus/)).toBeInTheDocument();
    expect(screen.queryAllByText("SF2")).toHaveLength(0);
  });

  it("pulling mostra progresso e desabilita o botao", () => {
    render(<UploadProtheusPullSection pulling pullResults={null} pullError={null} onPull={vi.fn()} />);

    expect(screen.getByText("Buscando no Protheus...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Buscando/ })).toBeDisabled();
  });

  it("erro de pull exibe o alerta vermelho", () => {
    render(<UploadProtheusPullSection pulling={false} pullResults={null} pullError="Protheus fora do ar" onPull={vi.fn()} />);

    expect(screen.getByText("Protheus fora do ar")).toBeInTheDocument();
  });

  it("resultados misturam sucesso, avisos de erro e falhas", () => {
    const { container } = render(
      <UploadProtheusPullSection
        pulling={false}
        pullResults={[pullOk, pullAviso, pullFalha]}
        pullError={null}
        onPull={vi.fn()}
      />
    );

    expect(screen.getByText("5 reg → 5 criado(s), 2 atualizado(s), 0 erro(s)")).toBeInTheDocument();
    expect(screen.getByText("Timeout na API")).toBeInTheDocument();
    expect(container.querySelector(".text-amber-500")).not.toBeNull();
    expect(container.querySelector(".text-emerald-500")).not.toBeNull();
    expect(container.querySelector(".text-red-500")).not.toBeNull();
  });
});

describe("UploadDropzoneSection", () => {
  it("vazio mostra so a dropzone sem lista nem botoes", () => {
    render(<UploadDropzoneSection {...propsDropzone} />);

    expect(screen.getByText("Upload manual de planilhas CSV complementares")).toBeInTheDocument();
    expect(screen.queryByText("Importar Planilhas")).toBeNull();
    expect(screen.queryByText("remover")).toBeNull();
  });

  it("lista arquivos, remove e aciona o upload", () => {
    const onRemoveFile = vi.fn();
    const onUpload = vi.fn();
    render(
      <UploadDropzoneSection
        {...propsDropzone}
        files={[new File(["a"], "base.csv"), new File(["b"], "clientes.csv")]}
        onRemoveFile={onRemoveFile}
        onUpload={onUpload}
      />
    );

    fireEvent.click(screen.getAllByText("remover")[1]);
    expect(onRemoveFile).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByText("Importar Planilhas"));
    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  it("uploading desabilita a importacao", () => {
    render(<UploadDropzoneSection {...propsDropzone} files={[new File(["a"], "base.csv")]} uploading />);

    expect(screen.getByRole("button", { name: /Importar Planilhas/ })).toBeDisabled();
  });

  it("exibe erro e resultados de importacao", () => {
    render(
      <UploadDropzoneSection
        {...propsDropzone}
        error="Falha ao importar"
        results={[{ arquivo: "SA1.csv", entidade: "SA1", registros: 3, sync: { entidade: "SA1", processados: 3, criados: 3, atualizados: 0, erros: 0 } }]}
      />
    );

    expect(screen.getByText("Falha ao importar")).toBeInTheDocument();
    expect(screen.getByText("SA1.csv")).toBeInTheDocument();
    expect(screen.getByText("3 registros processados")).toBeInTheDocument();
  });
});

describe("UploadPanel — integração com o hook", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pull pela API e adicao de arquivo refletem na tela", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, resultados: [pullOk] }) });
    const { container } = render(<UploadPanel />);

    await act(async () => {
      fireEvent.click(screen.getByText("Buscar no Protheus"));
    });
    expect(screen.getByText("SF2")).toBeInTheDocument();

    fireEvent.change(container.querySelector("#file-input")!, {
      target: { files: [new File(["x"], "local.csv")] },
    });
    expect(screen.getByText("local.csv")).toBeInTheDocument();
  });

  it("pull com falha exibe a mensagem de erro", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Sem conexão" }) });
    render(<UploadPanel />);

    await act(async () => {
      fireEvent.click(screen.getByText("Buscar no Protheus"));
    });

    expect(screen.getByText("Sem conexão")).toBeInTheDocument();
  });
});
