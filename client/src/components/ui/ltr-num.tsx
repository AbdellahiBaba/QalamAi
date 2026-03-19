function LtrNum({ children }: { children: React.ReactNode }) {
  return <span dir="ltr" lang="en" style={{ unicodeBidi: "isolate" }}>{children}</span>;
}

export default LtrNum;
