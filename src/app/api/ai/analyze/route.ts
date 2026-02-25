import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { AI_SYSTEM_PROMPT } from '@/lib/ai/prompts';

export const maxDuration = 30; // 30초 람다 타임아웃 

export async function POST(req: Request) {
    try {
        const { content, existingThemes = [], activeProblems = [] } = await req.json();

        if (!content) {
            return new Response(JSON.stringify({ error: 'Content is required' }), { status: 400 });
        }

        const { object } = await generateObject({
            model: google('gemini-1.5-pro-latest'), // Vercel AI SDK Google provider
            system: AI_SYSTEM_PROMPT,
            prompt: `
      [현재 존재하는 주제 풀(Themes)]: ${existingThemes.length ? existingThemes.join(', ') : '없음'}
      [현재 당면한 문제 풀(Problems)]: ${activeProblems.length ? activeProblems.join(', ') : '없음'}
      
      [사용자 입력 원문]: 
      "${content}"
      
      이 입력에 대해 상기 조건에 맞는 결과를 분석해 반환해주십시오.`,
            schema: z.object({
                status: z.enum(['DRAFT', 'HESITATED', 'CONCLUDED']).describe('이 생각이 결론에 도달했는지 여부'),
                themeName: z.string().describe('이 생각이 속할 수 있는 주제 카테고리 (기존 풀 또는 신규)'),
                problemTitle: z.string().describe('이 생각의 뿌리가 되는 명료한 질문/의문 형태'),
            }),
        });

        return new Response(JSON.stringify(object), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error: any) {
        console.error('AI Analysis Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to analyze text' }), { status: 500 });
    }
}
