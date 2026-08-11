import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import type { ContentTransferDto, ContentTransferResourceDto } from '../dto/content-transfer.dto';

@ValidatorConstraint({ name: 'contentTransferTags', async: false })
export class ContentTransferTagsConstraint implements ValidatorConstraintInterface {
  validate(resource: ContentTransferResourceDto, arguments_?: ValidationArguments) {
    const transfer = arguments_?.object as ContentTransferDto | undefined;
    return transfer?.version === 1 || (Array.isArray(resource?.tags) && resource.tags.length > 0);
  }

  defaultMessage() {
    return 'version 2 迁移文件的 resource.tags 在规范化后至少包含一项';
  }
}
