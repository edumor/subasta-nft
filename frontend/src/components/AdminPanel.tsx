"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Log, decodeEventLog } from "viem";
import { FACTORY_ABI, AUCTION_ABI } from "@/config/abi";
import { FACTORY_CONTRACT_ADDRESS, CHAINLINK_ETH_USD_SEPOLIA, WETH_SEPOLIA, SEPOLIA_EXPLORER } from "@/config/wagmi";
import { useAuctionConfig, type AuctionDisplayConfig } from "@/hooks/useAuctionConfig";
import { useAuctionState, shortenAddress } from "@/hooks/useAuction";

// ─── Helper: convert datetime-local string to unix timestamp ──────────────────
function datetimeToUnix(val: string): number {
  if (!val) return 0;
  return Math.floor(new Date(val).getTime() / 1000);
}

// ─── Helper: format unix ts to datetime-local input value ─────────────────────
function unixToDatetimeLocal(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  // Format: YYYY-MM-DDTHH:mm
  return d.toISOString().slice(0, 16);
}

type Tab = "display" | "deploy";

export function AdminPanel() {
  const { address, isConnected } = useAccount();
  const { config, updateConfig, resetConfig, contractAddress } = useAuctionConfig();
  const { data: auctionData } = useAuctionState();

  const seller = auctionData?.[0]?.result as `0x${string}` | undefined;
  const isSeller = !!seller && !!address &&
    address.toLowerCase() === seller.toLowerCase();

  // Admin panel is only visible to the seller
  if (!isConnected || !isSeller) return null;

  return (
    <div className="card border border-violet-500/30 space-y-0">
      {/* Panel header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-lg">
          ⚙️
        </div>
        <div>
          <p className="text-white font-bold">Panel de Administración</p>
          <p className="text-slate-500 text-xs">Solo visible para la wallet del vendedor</p>
        </div>
      </div>

      <AdminPanelContent
        config={config}
        updateConfig={updateConfig}
        resetConfig={resetConfig}
        currentContractAddress={contractAddress}
        sellerAddress={address!}
      />
    </div>
  );
}

// ─── Inner content (tabs) ─────────────────────────────────────────────────────

function AdminPanelContent({
  config,
  updateConfig,
  resetConfig,
  currentContractAddress,
  sellerAddress,
}: {
  config: AuctionDisplayConfig;
  updateConfig: (patch: Partial<AuctionDisplayConfig>) => void;
  resetConfig: () => void;
  currentContractAddress: `0x${string}`;
  sellerAddress: `0x${string}`;
}) {
  const [tab, setTab] = useState<Tab>("display");

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 rounded-lg p-1">
        <TabBtn active={tab === "display"} onClick={() => setTab("display")}>
          🖼️ Mostrar NFT
        </TabBtn>
        <TabBtn active={tab === "deploy"} onClick={() => setTab("deploy")}>
          🚀 Nueva Subasta
        </TabBtn>
      </div>

      {tab === "display" && (
        <DisplayConfigTab
          config={config}
          updateConfig={updateConfig}
          resetConfig={resetConfig}
          currentContractAddress={currentContractAddress}
        />
      )}
      {tab === "deploy" && (
        <DeployTab sellerAddress={sellerAddress} updateConfig={updateConfig} />
      )}
    </div>
  );
}

// ─── Tab: display config ──────────────────────────────────────────────────────

function DisplayConfigTab({
  config,
  updateConfig,
  resetConfig,
  currentContractAddress,
}: {
  config: AuctionDisplayConfig;
  updateConfig: (p: Partial<AuctionDisplayConfig>) => void;
  resetConfig: () => void;
  currentContractAddress: `0x${string}`;
}) {
  const [local, setLocal] = useState<AuctionDisplayConfig>(config);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    updateConfig(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function field(key: keyof AuctionDisplayConfig, label: string, placeholder: string, hint?: string) {
    return (
      <div className="space-y-1">
        <label className="text-slate-300 text-sm font-medium">{label}</label>
        <input
          type="text"
          value={local[key] as string}
          onChange={(e) => setLocal((p) => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full bg-slate-900 border border-slate-700 focus:border-violet-500 outline-none rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 transition-colors"
        />
        {hint && <p className="text-slate-500 text-xs">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-xs">
        Esta información se guarda en tu navegador y personaliza la UI de la subasta activa.
      </p>

      {/* Active contract override */}
      {field(
        "contractAddress",
        "Dirección del contrato activo",
        currentContractAddress,
        "Cambiá esto para apuntar a un nuevo contrato sin re-deploy del frontend."
      )}

      {/* NFT metadata */}
      {field("nftName", "Nombre del NFT", "Ej: Rare Punk #001")}
      {field(
        "nftImageUrl",
        "URL de la imagen",
        "https://... o ipfs://...",
        "Usá una URL HTTPS directa o una URL de gateway IPFS (e.g. https://ipfs.io/ipfs/...)."
      )}

      <div className="space-y-1">
        <label className="text-slate-300 text-sm font-medium">Descripción</label>
        <textarea
          value={local.nftDescription}
          onChange={(e) => setLocal((p) => ({ ...p, nftDescription: e.target.value }))}
          placeholder="Descripción corta del bien a subastar…"
          rows={3}
          className="w-full bg-slate-900 border border-slate-700 focus:border-violet-500 outline-none rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 transition-colors resize-none"
        />
      </div>

      {field("externalLink", "Enlace externo (opcional)", "https://opensea.io/...", "OpenSea, colección, sitio del creador, etc.")}

      {/* Preview */}
      {local.nftImageUrl && (
        <div className="bg-slate-900 rounded-lg p-3 flex items-center gap-3">
          <img
            src={local.nftImageUrl}
            alt="preview"
            className="w-14 h-14 rounded-lg object-cover border border-slate-700"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
          <div>
            <p className="text-white text-sm font-medium">{local.nftName || "(sin nombre)"}</p>
            <p className="text-slate-400 text-xs line-clamp-2">{local.nftDescription}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          className="btn-primary flex-1"
        >
          {saved ? "✅ Guardado" : "Guardar configuración"}
        </button>
        <button
          onClick={resetConfig}
          className="btn-secondary px-4 text-sm"
          title="Restaurar valores por defecto"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// ─── Tab: deploy new auction via factory ──────────────────────────────────────

const DEFAULT_DEPLOY: {
  nftContract: string;
  tokenId: string;
  paymentToken: string;
  priceFeed: string;
  startDatetime: string;
  endDatetime: string;
  royaltyRecipient: string;
  royaltyBps: string;
} = {
  nftContract: "",
  tokenId: "0",
  paymentToken: WETH_SEPOLIA,
  priceFeed: CHAINLINK_ETH_USD_SEPOLIA,
  startDatetime: "",    // empty = immediate start
  endDatetime: "",
  royaltyRecipient: "",
  royaltyBps: "250",
};

function DeployTab({
  sellerAddress,
  updateConfig,
}: {
  sellerAddress: `0x${string}`;
  updateConfig: (p: Partial<AuctionDisplayConfig>) => void;
}) {
  const [form, setForm] = useState({ ...DEFAULT_DEPLOY, royaltyRecipient: sellerAddress });
  const [error, setError]       = useState<string | null>(null);
  const [newAuction, setNewAuction] = useState<`0x${string}` | null>(null);
  const [txHash, setTxHash]     = useState<`0x${string}` | undefined>();

  const { writeContractAsync } = useWriteContract();
  const { isLoading: isDeploying, data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  // Parse new auction address from receipt logs
  if (receipt && !newAuction && txHash) {
    try {
      for (const log of receipt.logs as Log[]) {
        try {
          const decoded = decodeEventLog({
            abi: FACTORY_ABI,
            eventName: "AuctionCreated",
            data: log.data,
            topics: log.topics,
          });
          const addr = (decoded.args as any).auction as `0x${string}`;
          setNewAuction(addr);
          // Auto-save new auction address to config
          updateConfig({ contractAddress: addr });
          break;
        } catch {
          // not the right log, continue
        }
      }
    } catch {
      // ignore
    }
  }

  function set(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleDeploy() {
    setError(null);
    setNewAuction(null);

    if (!form.nftContract) { setError("Ingresá la dirección del contrato NFT."); return; }
    if (!form.endDatetime)  { setError("Ingresá la fecha y hora de cierre."); return; }

    const startTs = form.startDatetime ? datetimeToUnix(form.startDatetime) : 0;
    const endTs   = datetimeToUnix(form.endDatetime);
    const royBps  = parseInt(form.royaltyBps, 10);

    if (endTs <= Math.floor(Date.now() / 1000)) { setError("La fecha de cierre debe ser en el futuro."); return; }
    if (startTs && endTs <= startTs)             { setError("El cierre debe ser posterior al inicio."); return; }
    if (royBps < 0 || royBps > 1000)            { setError("Royalty máximo: 1000 bps (10%)."); return; }

    try {
      const hash = await writeContractAsync({
        address: FACTORY_CONTRACT_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "createAuction",
        args: [
          form.nftContract    as `0x${string}`,
          BigInt(form.tokenId || "0"),
          form.paymentToken   as `0x${string}`,
          form.priceFeed      as `0x${string}`,
          BigInt(startTs),
          BigInt(endTs),
          (form.royaltyRecipient || sellerAddress) as `0x${string}`,
          BigInt(royBps),
        ],
      });
      setTxHash(hash);
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? "Error al desplegar");
    }
  }

  function inputField(
    label: string,
    key: keyof typeof form,
    placeholder: string,
    hint?: string,
    type = "text"
  ) {
    return (
      <div className="space-y-1">
        <label className="text-slate-300 text-xs font-medium">{label}</label>
        <input
          type={type}
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-900 border border-slate-700 focus:border-violet-500 outline-none rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 transition-colors"
          disabled={isDeploying}
        />
        {hint && <p className="text-slate-500 text-xs">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-xs">
        Desplegá un nuevo <strong className="text-slate-300">AuctionNFT</strong> directamente desde tu wallet a través del Factory. La dirección del nuevo contrato se guardará automáticamente.
      </p>

      {/* NFT a subastar */}
      <div className="space-y-3 pb-3 border-b border-slate-700">
        <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Bien a subastar</p>
        {inputField("Contrato ERC-721 (NFT)", "nftContract", "0x…", "Dirección del smart contract del NFT")}
        {inputField("Token ID", "tokenId", "0", "ID del token dentro del contrato NFT", "number")}
      </div>

      {/* Token de pago */}
      <div className="space-y-3 pb-3 border-b border-slate-700">
        <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Token de pago y oracle</p>
        {inputField("Token ERC-20 (pago)", "paymentToken", WETH_SEPOLIA, "WETH en Sepolia por defecto")}
        {inputField("Chainlink Price Feed", "priceFeed", CHAINLINK_ETH_USD_SEPOLIA, "Oracle de Chainlink para conversión a USD")}
      </div>

      {/* Tiempo */}
      <div className="space-y-3 pb-3 border-b border-slate-700">
        <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Horario de la subasta</p>
        <div className="space-y-1">
          <label className="text-slate-300 text-xs font-medium">Inicio (vacío = inmediato)</label>
          <input
            type="datetime-local"
            value={form.startDatetime}
            onChange={(e) => set("startDatetime", e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 focus:border-violet-500 outline-none rounded-lg px-3 py-2 text-white text-sm transition-colors"
            disabled={isDeploying}
          />
          <p className="text-slate-500 text-xs">Si lo dejás vacío la subasta arranca en el momento del deploy.</p>
        </div>
        <div className="space-y-1">
          <label className="text-slate-300 text-xs font-medium">Cierre *</label>
          <input
            type="datetime-local"
            value={form.endDatetime}
            onChange={(e) => set("endDatetime", e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 focus:border-violet-500 outline-none rounded-lg px-3 py-2 text-white text-sm transition-colors"
            disabled={isDeploying}
          />
        </div>

        {/* Preview timing */}
        {form.endDatetime && (
          <div className="bg-slate-900 rounded-lg p-3 text-xs text-slate-400 space-y-0.5">
            {form.startDatetime
              ? <p>🟡 Inicio: <span className="text-slate-200">{new Date(form.startDatetime).toLocaleString()}</span></p>
              : <p>🟢 Inicio: <span className="text-slate-200">Inmediato (al confirmar la tx)</span></p>
            }
            <p>🔴 Cierre: <span className="text-slate-200">{new Date(form.endDatetime).toLocaleString()}</span></p>
          </div>
        )}
      </div>

      {/* Royalties */}
      <div className="space-y-3">
        <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Regalías (royalties)</p>
        {inputField("Receptor de royalties", "royaltyRecipient", sellerAddress, "Por defecto: tu wallet")}
        {inputField("Royalty en BPS", "royaltyBps", "250", "250 = 2.5% | Máximo: 1000 (10%)", "number")}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* Success */}
      {newAuction && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-sm text-emerald-300 space-y-2">
          <p>✅ ¡Nueva subasta desplegada!</p>
          <a
            href={`${SEPOLIA_EXPLORER}/address/${newAuction}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-emerald-400 hover:text-emerald-300 break-all"
          >
            {newAuction} ↗
          </a>
          <p className="text-xs text-slate-400">
            ⚠️ Recordá transferir el NFT al nuevo contrato para que la subasta funcione.
          </p>
        </div>
      )}

      {/* Deploy button */}
      {!newAuction && (
        <button
          onClick={handleDeploy}
          disabled={isDeploying || !form.nftContract || !form.endDatetime}
          className="btn-primary w-full"
        >
          {isDeploying ? "Desplegando contrato…" : "🚀 Desplegar Nueva Subasta"}
        </button>
      )}

      {newAuction && (
        <button
          onClick={() => { setForm({ ...DEFAULT_DEPLOY, royaltyRecipient: sellerAddress }); setNewAuction(null); setTxHash(undefined); }}
          className="btn-secondary w-full"
        >
          Crear otra subasta
        </button>
      )}

      <p className="text-xs text-slate-500 text-center">
        El Factory está desplegado en Sepolia. Necesitás ETH para el gas.
      </p>
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-violet-600 text-white"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
