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

## Solution

```ts
interface Solution {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 解决方案 UUID |
| `title` | `string` | 标题，长度 `1-200` |
| `summary` | `string` | 列表摘要，最大长度 `500` |
| `content` | `string` | Markdown 正文，不能为空 |
| `category` | `string` | 分类，最大长度 `80`，未设置时为空字符串 |
| `tags` | `string[]` | 标签数组 |
| `createdAt` | `string` | 创建时间 |
| `updatedAt` | `string` | 更新时间 |

## CreateSolutionRequest

```ts
interface CreateSolutionRequest {
  title: string;
  summary?: string;
  content: string;
  category?: string;
  tags: string[];
}
```

## UpdateSolutionRequest

`UpdateSolutionRequest` 与 `CreateSolutionRequest` 字段一致，但所有字段均可选；传入 `tags` 时，去除首尾空白并去重后至少包含一项。

## Note

```ts
interface Note {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 学习笔记 UUID |
| `title` | `string` | 标题，长度 `1-200` |
| `summary` | `string` | 列表摘要，最大长度 `500` |
| `content` | `string` | Markdown 正文，不能为空 |
| `category` | `string` | 分类，最大长度 `80`，未设置时为空字符串 |
| `tags` | `string[]` | 标签数组 |
| `createdAt` | `string` | 创建时间 |
| `updatedAt` | `string` | 更新时间 |

## CreateNoteRequest

```ts
interface CreateNoteRequest {
  title: string;
  summary?: string;
  content: string;
  category?: string;
  tags: string[];
}
```

## UpdateNoteRequest

`UpdateNoteRequest` 与 `CreateNoteRequest` 字段一致，但所有字段均可选；传入 `tags` 时，去除首尾空白并去重后至少包含一项。

## UiPrototype

```ts
interface UiPrototype {
  id: string;
  title: string;
  summary: string;
  html: string;
  category: string;
  tags: string[];
  allowExternal: boolean;
  createdAt: string;
  updatedAt: string;
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | UI 原型 UUID |
| `title` | `string` | 原型名称，长度 `1-160` |
| `summary` | `string` | 原型描述，最大长度 `500` |
| `html` | `string` | 完整单文件 HTML，UTF-8 编码后最大 `2 MB` |
| `category` | `string` | 分类，最大长度 `80`，未设置时为空字符串 |
| `tags` | `string[]` | 标签数组 |
| `allowExternal` | `boolean` | 是否允许预览加载远程资源 |
| `createdAt` | `string` | 创建时间 |
| `updatedAt` | `string` | 更新时间 |

## CreateUiPrototypeRequest

```ts
interface CreateUiPrototypeRequest {
  title: string;
  summary?: string;
  html: string;
  category?: string;
  tags?: string[];
  allowExternal?: boolean;
}
```

## UpdateUiPrototypeRequest

`UpdateUiPrototypeRequest` 与 `CreateUiPrototypeRequest` 字段一致，但所有字段均可选。

## Annotation

```ts
type AnnotationResourceType = 'NOTE' | 'SOLUTION';

interface Annotation {
  id: string;
  resourceType: AnnotationResourceType;
  resourceId: string;
  content: string;
  exact: string;
  prefix: string;
  suffix: string;
  start: number;
  end: number;
  documentUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

批注 `content` 使用 Markdown 格式。`start/end` 与 `exact/prefix/suffix` 共同组成文本双锚点，正文修改后无法唯一匹配的批注仍会保留，等待重新关联。

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

## ContentTransferFile

```ts
interface ContentTransferFile {
  format: 'prompt-skill-manager-transfer';
  version: 1 | 2;
  resourceType: 'NOTE' | 'SOLUTION';
  exportedAt: string;
  resource: {
    title: string;
    summary: string;
    content: string;
    category: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
  };
  annotations: Array<{
    content: string;
    exact: string;
    prefix: string;
    suffix: string;
    start: number;
    end: number;
    documentUpdatedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

迁移文件不包含资源和批注 UUID。导入时生成新的 UUID，避免覆盖目标环境已有数据；`format` 与 `version` 用于校验文件来源和后续格式兼容。v1 允许 `resource.tags` 为空，以兼容历史无标签内容；v2 的标签在去除首尾空白并去重后至少包含一项。当前有标签内容导出为 v2，无标签历史内容继续导出为可兼容导入的 v1。

## ContentTagCloudResponse

```ts
interface ContentTagCloudResponse {
  items: Array<{
    name: string;
    total: number;
    solutionCount: number;
    noteCount: number;
  }>;
  totalTags: number;
  taggedSolutionCount: number;
  taggedNoteCount: number;
}
```

## ContentTagItemsResponse

```ts
interface ContentTagItemsResponse {
  items: Array<{
    id: string;
    title: string;
    summary: string;
    category: string;
    tags: string[];
    resourceType: 'SOLUTION' | 'NOTE';
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
}
```
