import Cookies from "js-cookie";
import { Navigate, Route, Routes } from "react-router-dom";
import { useUser } from "./hooks/useUser";
import DebateComponent from "./pages/compete";
import DashboardPage from "./pages/dashboard";
import DebateChat from "./pages/coach";
import DebateRecorder from "./pages/debate-recorder";
import LandingPage from "./pages/landing-page";
import LearningPage from "./pages/learning";
import { LoginForm } from "./pages/login-form";
import OnBoarding from "./pages/OnBoarding";
import CharacterPage from "./pages/CharacterPage";
import { SignUpForm } from "./pages/sign-up-form";
import TestPage from "./pages/test";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const cookie = Cookies.get("token");
  if (cookie) {
    return children;
  } else {
    return <Navigate to="/auth/login" />;
  }
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const cookie = Cookies.get("token");
  if (cookie) {
    return <Navigate to="/dashboard" />;
  } else {
    return children;
  }
};

export default function App() {
  const { setUser } = useUser();

  // useEffect(() => {
  //   const getUser = async () => {
  //     const res = await api.get("/api/user/me");

  //     if (res.data.success) {
  //       setUser(res.data.data as User);
  //     }
  //   };
  //   getUser();
  // }, []);

  const userId = localStorage.getItem("userId");

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/learning" element={<LearningPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/coach" element={<DebateChat />} />
        <Route
          path="/auth/register"
          element={
            <AuthRoute>
              <SignUpForm />
            </AuthRoute>
          }
        />
        <Route
          path="/auth/login"
          element={
            <AuthRoute>
              <LoginForm />
            </AuthRoute>
          }
        />
        <Route path="/debate-recorder" element={<DebateRecorder />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/onboarding" element={<OnBoarding />} />
        <Route
          path="/compete"
          element={<DebateComponent userId={userId || "6896912681uhf7"} />}
        />
        <Route path="/character" element={<CharacterPage />} />
      </Routes>
    </>
  );
}
