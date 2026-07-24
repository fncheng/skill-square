import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAdmin } from './components/auth/RequireAdmin';
import { AppLayout } from './components/layout/AppLayout';
import { CategoryManage } from './views/CategoryManage';
import { NoteDetail } from './views/NoteDetail';
import { NoteEditor } from './views/NoteEditor';
import { NoteList } from './views/NoteList';
import { Login } from './views/Login';
import { PromptDetail } from './views/PromptDetail';
import { PromptEditor } from './views/PromptEditor';
import { PromptList } from './views/PromptList';
import { SolutionDetail } from './views/SolutionDetail';
import { SolutionEditor } from './views/SolutionEditor';
import { SolutionList } from './views/SolutionList';
import { TagManage } from './views/TagManage';
import { UiPrototypeDetail } from './views/UiPrototypeDetail';
import { UiPrototypeEditor } from './views/UiPrototypeEditor';
import { UiPrototypeList } from './views/UiPrototypeList';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/prompts" replace />} />
        <Route path="/prompts" element={<PromptList />} />
        <Route path="/prompts/:id" element={<PromptDetail />} />
        <Route path="/solutions" element={<SolutionList />} />
        <Route path="/solutions/:id" element={<SolutionDetail />} />
        <Route path="/notes" element={<NoteList />} />
        <Route path="/notes/:id" element={<NoteDetail />} />
        <Route path="/ui-prototypes" element={<UiPrototypeList />} />
        <Route path="/ui-prototypes/:id" element={<UiPrototypeDetail />} />
        <Route element={<RequireAdmin />}>
          <Route path="/prompts/new" element={<PromptEditor />} />
          <Route path="/prompts/:id/edit" element={<PromptEditor />} />
          <Route path="/solutions/new" element={<SolutionEditor />} />
          <Route path="/solutions/:id/edit" element={<SolutionEditor />} />
          <Route path="/notes/new" element={<NoteEditor />} />
          <Route path="/notes/:id/edit" element={<NoteEditor />} />
          <Route path="/ui-prototypes/new" element={<UiPrototypeEditor />} />
          <Route path="/ui-prototypes/:id/edit" element={<UiPrototypeEditor />} />
          <Route path="/categories" element={<CategoryManage />} />
          <Route path="/tags" element={<TagManage />} />
        </Route>
        <Route path="*" element={<Navigate to="/prompts" replace />} />
      </Route>
    </Routes>
  );
}
