-- ============================================
-- PhoenixPerevod: первый администратор
-- Запусти это в Neon SQL Editor ПОСЛЕ 0002_users.sql
-- Логин: admin
-- Пароль: 29042002VaSiLA  (смени на свой, если нужно)
-- ============================================

INSERT INTO users (username, password_hash, role)
VALUES (
  'admin',
  'C9mYY0EYgzATZk6/EOcmkg==:XNZ8coLhl5Hm6o9EjP5y5SmczLDgz6G2QCU56ukUZ0fUALB0YsEjC6j9ySDJAGYLnzkdBkkub49nacqtj0WtbA==',
  'admin'
)
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash, role = 'admin';
