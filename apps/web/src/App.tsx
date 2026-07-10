import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { CategoryManage } from './views/CategoryManage';
import { PromptDetail } from './views/PromptDetail';
import { PromptEditor } from './views/PromptEditor';
import { PromptList } from './views/PromptList';
import { SolutionDetail } from './views/SolutionDetail';
import { SolutionEditor } from './views/SolutionEditor';
import { SolutionList } from './views/SolutionList';
import { TagManage } from './views/TagManage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/prompts" replace />} />
        <Route path="/prompts" element={<PromptList />} />
        <Route path="/prompts/new" element={<PromptEditor />} />
        <Route path="/prompts/:id" element={<PromptDetail />} />
        <Route path="/prompts/:id/edit" element={<PromptEditor />} />
        <Route path="/solutions" element={<SolutionList />} />
        <Route path="/solutions/new" element={<SolutionEditor />} />
        <Route path="/solutions/:id" element={<SolutionDetail />} />
        <Route path="/solutions/:id/edit" element={<SolutionEditor />} />
        <Route path="/categories" element={<CategoryManage />} />
        <Route path="/tags" element={<TagManage />} />
        <Route path="*" element={<Navigate to="/prompts" replace />} />
      </Route>
    </Routes>
  );
}
