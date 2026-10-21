import { Module } from '@nestjs/common';
import { MarkdownImagePolicyController } from './markdown-image-policy.controller';
import { MarkdownImagePolicyService } from './markdown-image-policy.service';

@Module({
  controllers: [MarkdownImagePolicyController],
  providers: [MarkdownImagePolicyService]
})
export class MarkdownImagePolicyModule {}
