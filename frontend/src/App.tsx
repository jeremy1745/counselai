import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import CaseList from './components/CaseList'
import CaseDetail from './components/CaseDetail'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<CaseList />} />
          <Route path="/cases/:caseId/*" element={<CaseDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
