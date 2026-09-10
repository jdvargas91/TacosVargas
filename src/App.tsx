import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ProductsProvider } from "@/context/ProductsContext";
import { ReviewsProvider } from "@/context/ReviewsContext";
import { HashScroll } from "@/components/HashScroll";
import { Home } from "@/pages/Home";
import { Pedido } from "@/pages/Pedido";
import { ProductDetail } from "@/pages/ProductDetail";
import { MisPedidos } from "@/pages/MisPedidos";
import { Admin } from "@/pages/Admin";

export default function App() {
  return (
    <AuthProvider>
      <ProductsProvider>
        <CartProvider>
          <ReviewsProvider>
            <BrowserRouter>
              <HashScroll />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/producto/:id" element={<ProductDetail />} />
                <Route path="/pedido" element={<Pedido />} />
                <Route path="/pedir" element={<Navigate to="/pedido" replace />} />
                <Route path="/mis-pedidos" element={<MisPedidos />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </BrowserRouter>
          </ReviewsProvider>
        </CartProvider>
      </ProductsProvider>
    </AuthProvider>
  );
}
