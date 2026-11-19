import { Route } from 'react-router-dom';
import GestorSecaoPage from './GestorSecaoPage';
import { SECOES } from '../config/secoes';

export const secaoRoutes = Object.keys(SECOES).map((slug) => (
  <Route key={slug} path={slug} element={<GestorSecaoPage slug={slug} />} />
));
