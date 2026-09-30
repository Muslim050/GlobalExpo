import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { router } from '@/router'
import { queryClient } from '@/lib/queryClient'
import { setTokensRefreshedHandler, setUnauthorizedHandler } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import { DataProvider } from '@/context/DataContext.jsx'
import { ToastProvider } from '@/components/ui/Toast.jsx'
import { ConfirmProvider } from '@/components/ui/Confirm.jsx'

// Транспорт сам меняет истёкший access по refresh — сохраняем новую пару,
// иначе после перезагрузки страницы она потеряется.
setTokensRefreshedHandler((tokens) => {
  useAuthStore.getState().setTokens(tokens)
})

// Обновить не удалось: refresh погашен или подделан — сессии конец.
setUnauthorizedHandler(() => {
  useAuthStore.getState().clearSession()
  queryClient.clear()
})

// Сессия пропала — неважно, по кнопке «Выйти» или из-за 401 — уводим на вход.
// Защита маршрутов живёт в beforeLoad, а он срабатывает только при навигации,
// поэтому переход инициируем здесь, по факту очистки хранилища.
useAuthStore.subscribe((state, prev) => {
  if (prev.user && !state.user) {
    router.navigate({ to: '/login', replace: true })
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <DataProvider>
        <ToastProvider>
          <ConfirmProvider>
            <RouterProvider router={router} />
          </ConfirmProvider>
        </ToastProvider>
      </DataProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
