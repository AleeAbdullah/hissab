import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MaxLength(1024)
  currentPassword!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(1024)
  newPassword!: string;
}
