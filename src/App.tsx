import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ProductsProvider } from "@/context/ProductsContext";
import { ReviewsProvider } from "@/context/ReviewsContext";
import { SiteContentProvider } from "@/context/SiteContentContext";
import { HashScroll } from "@/components/HashScroll";
import { Home } from "@/pages/Home";
import { Pedido } from "@/pages/Pedido";
import { ProductDetail } from "@/pages/ProductDetail";
import { MisPedidos } from "@/pages/MisPedidos";
import { Sistema } from "@/pages/Sistema";
import { Login } from "@/pages/Login";
import { Cuenta } from "@/pages/Cuenta";

export default function App() {
  return (
    <AuthProvider>
      <SiteContentProvider>
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
                  <Route path="/cuenta" element={<Cuenta />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/sistema" element={<Sistema />} />
                  <Route path="/sistema/:seccion" element={<Sistema />} />
                  <Route path="/admin" element={<Navigate to="/sistema" replace />} />
                </Routes>
              </BrowserRouter>
            </ReviewsProvider>
          </CartProvider>
        </ProductsProvider>
      </SiteContentProvider>
    </AuthProvider>
  );
}
