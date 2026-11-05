import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchParamInput } from "@/components/molecules/search-param-input";
import {
  TodayOrdersTitle,
  OrderBoard,
} from "@/components/organisms/order-board";
import { OrderBoardTemplate } from "@/components/templates/order-board-template";
import { ORDER_SEARCH_PARAM } from "@/lib/orders/board";

import { setComplementAvailabilityAction } from "../cardapio/complementos/actions";
import { setProductAvailabilityAction } from "../cardapio/produtos/actions";
import {
  advanceOrderAction,
  closeOrderAction,
  markOrderReadAction,
  setOrderPaidAction,
} from "./actions";

export const metadata: Metadata = { title: "Pedidos" };

// Os pedidos vêm do provider do layout do painel, já em tempo real.
export default function OrdersPage() {
  return (
    <OrderBoardTemplate
      title={<TodayOrdersTitle />}
      action={
        <Suspense>
          <SearchParamInput
            name={ORDER_SEARCH_PARAM}
            placeholder="Nome, nº ou telefone"
          />
        </Suspense>
      }
    >
      <Suspense>
        <OrderBoard
          actions={{
            advance: advanceOrderAction,
            closeOrder: closeOrderAction,
            setPaid: setOrderPaidAction,
            markRead: markOrderReadAction,
            setProductAvailability:
              setProductAvailabilityAction,
            setComplementAvailability:
              setComplementAvailabilityAction,
          }}
        />
      </Suspense>
    </OrderBoardTemplate>
  );
}
