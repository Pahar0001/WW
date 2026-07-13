import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Module,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z, ZodError } from 'zod';
import { AssistantService } from './assistant.service';
import { JwtAuthGuard } from '../auth/auth.guards';

const ChatIn = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});

// Login required to use the AI consultant (bounds cost / abuse).
@Controller('assistant')
@UseGuards(JwtAuthGuard)
class AssistantController {
  constructor(private readonly svc: AssistantService) {}

  @Get('status')
  status() {
    return { configured: this.svc.configured() };
  }

  @Post('chat')
  chat(@Body() body: unknown) {
    let d;
    try {
      d = ChatIn.parse(body);
    } catch (e) {
      if (e instanceof ZodError) throw new BadRequestException(e.flatten());
      throw e;
    }
    return this.svc.chat(d.messages);
  }
}

@Module({
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
