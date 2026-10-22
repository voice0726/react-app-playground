import { columnVisibilityFeature, rowSortingFeature, tableFeatures } from '@tanstack/react-table'

// 並べ替えと絞り込みはサーバーが行う。行モデルを登録しないことで、受け取った順のまま描画する
export const features = tableFeatures({
  rowSortingFeature,
  columnVisibilityFeature,
})
