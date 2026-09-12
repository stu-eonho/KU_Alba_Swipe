/**
 * OWNER: Dev B (screens)
 * TODO(B): 480px container + TopBar + BottomTabBar (홈 / 찜 / 설정).
 * See SPEC <global_layout>.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="app-shell">{children}</div>;
}
