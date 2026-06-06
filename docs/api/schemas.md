# 数据结构

## Category

```ts
interface Category {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 分类 UUID |
| `name` | `string` | 分类名称，唯一，长度 `1-80` |
| `description` | `string` | 分类描述，最大长度 `500` |
| `createdAt` | `string` | 创建时间 |
| `updatedAt` | `string` | 更新时间 |

## Tag

```ts
interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 标签 UUID |
| `name` | `string` | 标签名称，唯一，长度 `1-80` |
| `color` | `string` | HEX 颜色，例如 `#3b82f6` |
| `createdAt` | `string` | 创建时间 |
| `updatedAt` | `string` | 更新时间 |

## Prompt

```ts
interface Prompt {
  id: string;
  name: string;
  description: string;
  content: string;
  isFavorite: boolean;
  categoryId: string | null;
  category: Category | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | Prompt UUID |
| `name` | `string` | Prompt 名称，长度 `1-160` |
| `description` | `string` | Prompt 描述，最大长度 `1000` |
| `content` | `string` | Prompt 正文内容，不能为空 |
| `isFavorite` | `boolean` | 是否收藏 |
| `categoryId` | `string \| null` | 分类 UUID，不设置时为 `null` |
| `category` | `Category \| null` | 分类详情，不设置分类时为 `null` |
| `tags` | `Tag[]` | 标签列表 |
| `createdAt` | `string` | 创建时间 |
| `updatedAt` | `string` | 更新时间 |

## PromptVersion

```ts
interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  name: string;
  description: string;
  content: string;
  isFavorite: boolean;
  categoryId: string | null;
  categoryName: string | null;
  tagIds: string[];
  tagNames: string[];
  createdAt: string;
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 版本 UUID |
| `promptId` | `string` | 所属 Prompt UUID |
| `version` | `number` | 版本号，从 `1` 开始递增 |
| `name` | `string` | 版本快照中的 Prompt 名称 |
| `description` | `string` | 版本快照中的 Prompt 描述 |
| `content` | `string` | 版本快照中的 Prompt 正文 |
| `isFavorite` | `boolean` | 版本快照中的收藏状态 |
| `categoryId` | `string \| null` | 版本快照中的分类 UUID |
| `categoryName` | `string \| null` | 版本快照中的分类名称 |
| `tagIds` | `string[]` | 版本快照中的标签 UUID 列表 |
| `tagNames` | `string[]` | 版本快照中的标签名称列表 |
| `createdAt` | `string` | 版本生成时间 |

## CreatePromptRequest

```ts
interface CreatePromptRequest {
  name: string;
  description?: string;
  content: string;
  categoryId?: string | null;
  tagIds?: string[];
  isFavorite?: boolean;
}
```

## UpdatePromptRequest

`UpdatePromptRequest` 与 `CreatePromptRequest` 字段一致，但所有字段均可选。

## CreateCategoryRequest

```ts
interface CreateCategoryRequest {
  name: string;
  description?: string;
}
```

## UpdateCategoryRequest

`UpdateCategoryRequest` 与 `CreateCategoryRequest` 字段一致，但所有字段均可选。

## CreateTagRequest

```ts
interface CreateTagRequest {
  name: string;
  color?: string;
}
```

## UpdateTagRequest

`UpdateTagRequest` 与 `CreateTagRequest` 字段一致，但所有字段均可选。
