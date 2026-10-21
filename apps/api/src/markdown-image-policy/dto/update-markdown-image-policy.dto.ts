import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsInt, IsString, MaxLength, Min, Validate, ValidatorConstraint, type ValidationArguments, type ValidatorConstraintInterface } from 'class-validator';
import { normalizeMarkdownImageHost } from '../markdown-image-policy.utils';

@ValidatorConstraint({ name: 'isMarkdownImageHost', async: false })
class IsMarkdownImageHostConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && normalizeMarkdownImageHost(value) !== null;
  }

  defaultMessage(_arguments: ValidationArguments): string {
    return 'allowedHosts 中的每一项必须是合法的精确公网 Host，且不能包含协议、端口、路径或通配符。';
  }
}

export class UpdateMarkdownImagePolicyDto {
  @ApiProperty({
    description: '允许加载 Markdown 图片的精确 HTTPS Host 列表。服务端会规范化、去重并排序。',
    example: ['cdn.example.com', 'images.unsplash.com'],
    maxItems: 100,
    maxLength: 253
  })
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(253, { each: true })
  @Validate(IsMarkdownImageHostConstraint, { each: true })
  allowedHosts: string[];

  @ApiProperty({ description: '读取策略时返回的版本号，用于避免覆盖其他管理员的更新。', example: 3, minimum: 0 })
  @IsInt()
  @Min(0)
  expectedVersion: number;
}
