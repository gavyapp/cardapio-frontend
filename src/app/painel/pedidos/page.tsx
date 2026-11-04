import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchParamInput } from "@/components/molecules/search-param-input";
import {
  OpenOrdersTitle,
  OrderBoard,
} from "@/components/organisms/order-board";
import { OrderBoardTemplate } from "@/components/templates/order-board-template";
import { ORDER_SEARCH_PARAM } from "@/lib/orders/board";

import { advanceOrderAction } from "./actions";

export const metadata: Metadata = { title: "Pedidos" };

// Os pedidos vêm do provider do layout do painel, já em tempo real.
export default function OrdersPage() {
  return (
    <OrderBoardTemplate
      title={<OpenOrdersTitle />}
      action={
        <Suspense>
          <SearchParamInput
            name={ORDER_SEARCH_PARAM}
            placeholder="Buscar por número ou cliente"
          />
        </Suspense>
      }
    >
      <Suspense>
        <OrderBoard advance={advanceOrderAction} />
      </Suspense>
    </OrderBoardTemplate>
  );
}
