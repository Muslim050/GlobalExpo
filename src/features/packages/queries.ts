import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as packagesApi from '@/api/endpoints/packages'
import type { StandPackage, StandPackageInput } from '@/api/types'

export const packageKeys = {
  all: ['packages'] as const,
}

/** Каталог стендов целиком — их немного, грузим разом. */
export function usePackages() {
  return useQuery({
    queryKey: packageKeys.all,
    queryFn: packagesApi.list,
  })
}

/** Новый стенд в категории каталога. */
export function useCreatePackage() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: packagesApi.create,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: packageKeys.all })
    },
  })
}

/** Убрать стенд из каталога. */
export function useDeletePackage() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: packagesApi.remove,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: packageKeys.all })
    },
  })
}

/** Правка стенда каталога: название, описание, площадь, цена, состав, фото. */
export function useUpdatePackage() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({
      key,
      input,
    }: {
      key: StandPackage['key']
      input: StandPackageInput
    }) => packagesApi.update(key, input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: packageKeys.all })
    },
  })
}
