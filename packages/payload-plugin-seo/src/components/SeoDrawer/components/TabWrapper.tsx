interface TabWrapperProps {
  children: React.ReactNode;
}

export function TabWrapper({ children }: TabWrapperProps) {
  return <div className="py-[18px]">{children}</div>;
}
