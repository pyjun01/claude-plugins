import { IsString, IsOptional, IsIn, MaxLength, IsNotEmpty } from 'class-validator';

/** DTO for creating a new task */
export class CreateTaskDto {
  @IsString({ message: 'Title must not be empty' })
  @IsNotEmpty({ message: 'Title must not be empty' })
  @MaxLength(200, { message: 'Title must be 200 characters or fewer' })
  title: string;

  @IsOptional()
  @IsString({ message: 'Priority must be one of: low, medium, high' })
  @IsIn(['low', 'medium', 'high'], { message: 'Priority must be one of: low, medium, high' })
  priority?: string;
}

/** DTO for updating an existing task */
export class UpdateTaskDto {
  @IsOptional()
  @IsString({ message: 'Title must not be empty' })
  @IsNotEmpty({ message: 'Title must not be empty' })
  @MaxLength(200, { message: 'Title must be 200 characters or fewer' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Priority must be one of: low, medium, high' })
  @IsIn(['low', 'medium', 'high'], { message: 'Priority must be one of: low, medium, high' })
  priority?: string;
}
