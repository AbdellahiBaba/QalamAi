function LtrNum({ children }: { children: React.ReactNode }) {
  return <span dir="ltr" style={{ unicodeBidi: "isolate" }}>{children}</span>;
}

export default LtrNum;
