type Props = {
  label?: string;
};

export function LoadingScreen({ label = "Comprobando sesión…" }: Props) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0d12",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#9aa3b5",
        fontFamily: "system-ui, sans-serif",
      }}
      aria-busy="true"
      aria-label={label}
    >
      {label}
    </div>
  );
}
