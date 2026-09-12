/** OWNER: Dev B (screens) */
import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from '@/components/layout';
import { router } from './router';

export default function App() {
  // 루트 바운더리. 여기까지 올라온 오류는 화면 전체를 폴백으로 바꾼다.
  // 덱에는 별도 바운더리가 걸려 있어(HomeDeckPage) 카드 오류가 여기까지 오지 않는다.
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
