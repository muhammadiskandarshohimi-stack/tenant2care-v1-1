
export default function DashboardPage() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#fff0f8",
      padding: "24px",
      fontFamily: "Arial, sans-serif"
    }}>
      <h1 style={{ color: "#a91372" }}>
        Tenant2Care v1.1
      </h1>

      <p>Property Management Dashboard</p>

      <div style={{
        background: "white",
        padding: "24px",
        borderRadius: "16px",
        marginTop: "24px"
      }}>
        <h2>Welcome to Tenant2Care</h2>
        <p>Dashboard route is working.</p>
        <p>Properties | Tenants | Payments | Repairs</p>
      </div>
    </main>
  );
}
