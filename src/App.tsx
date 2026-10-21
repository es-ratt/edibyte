import { Navigate, Route, Routes } from "react-router-dom"
import Layout from "./components/Layout"
import { useStore } from "./hooks/useStore"
import Onboarding from "./pages/Onboarding"
import Today from "./pages/Today"
import Plan from "./pages/Plan"
import Foods from "./pages/Foods"
import ProfilePage from "./pages/Profile"

export default function App() {
  const { profile, plan } = useStore()
  const ready = !!profile && !!plan
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={ready ? <Layout /> : <Navigate to="/onboarding" replace />}>
        <Route index element={<Today />} />
        <Route path="plan" element={<Plan />} />
        <Route path="foods" element={<Foods />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  )
}
