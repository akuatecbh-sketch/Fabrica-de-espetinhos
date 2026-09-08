import { exigirAcesso } from "@/lib/permissoes";
import { PedidoTela } from "../pedido-tela";

export const dynamic = "force-dynamic";

export default async function NovoPedidoPage() {
  await exigirAcesso("pedidos");
  return <PedidoTela pedido={null} />;
}
