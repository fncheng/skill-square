import { SetMetadata } from '@nestjs/common';
import { PUBLIC_WRITE_KEY } from '../auth.constants';

export const PublicWrite = () => SetMetadata(PUBLIC_WRITE_KEY, true);
