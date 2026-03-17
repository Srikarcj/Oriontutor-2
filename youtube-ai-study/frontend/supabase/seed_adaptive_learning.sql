-- Seed data for Adaptive Learning System

insert into public.courses (slug, title, description, category, difficulty)
values
  ('genai-dev', 'Generative AI Development', 'Build and deploy generative AI apps using modern model stacks.', 'AI', 'Intermediate'),
  ('fullstack-ai', 'Full-Stack AI Engineering', 'End-to-end AI product engineering from UX to infra.', 'AI', 'Intermediate'),
  ('ai-agents', 'AI Agents & Autonomous Systems', 'Design agentic workflows, tools, and orchestration.', 'AI', 'Advanced'),
  ('mlops-deploy', 'MLOps & AI Deployment', 'Ship reliable ML systems with CI/CD and monitoring.', 'MLOps', 'Intermediate'),
  ('data-eng', 'Modern Data Engineering', 'Build scalable data platforms for AI systems.', 'Data', 'Intermediate'),
  ('prompt-adv', 'Advanced Prompt Engineering', 'Craft robust prompts, evaluations, and guardrails.', 'AI', 'Advanced')
on conflict (slug) do nothing;

-- Modules: 1 beginner foundation + 5 intermediate modules + 5 advanced modules per course
insert into public.modules (course_id, module_number, title, concept, explanation, level_type)
select id, 0,
  'Beginner Foundation',
  'Foundational terminology and mental models',
  'Basic terminology, foundational theory, and simple examples to prep for the main modules.',
  'beginner'
from public.courses;

-- Generative AI Development
insert into public.modules (course_id, module_number, title, concept, explanation, level_type)
select id, 1, 'Model Families', 'LLMs vs diffusion vs multimodal',
  'Intermediate: compare model families, strengths, and constraints with practical examples.', 'intermediate'
from public.courses where slug = 'genai-dev'
union all
select id, 2, 'Prompt Patterns', 'System/role/task patterns',
  'Intermediate: prompt scaffolding and structured outputs for reliable behavior.', 'intermediate'
from public.courses where slug = 'genai-dev'
union all
select id, 3, 'RAG Basics', 'Retrieval and grounding',
  'Intermediate: chunking, embeddings, and context injection patterns.', 'intermediate'
from public.courses where slug = 'genai-dev'
union all
select id, 4, 'Safety & Guardrails', 'Red teaming and filters',
  'Intermediate: safety filters, content moderation, and evals.', 'intermediate'
from public.courses where slug = 'genai-dev'
union all
select id, 5, 'Shipping GenAI', 'Latency and UX trade-offs',
  'Intermediate: caching, streaming, and user experience optimization.', 'intermediate'
from public.courses where slug = 'genai-dev'
union all
select id, 1, 'Advanced Prompt Architecture', 'Programmatic prompting',
  'Advanced: prompt graphs, function calling, and tool routing.', 'advanced'
from public.courses where slug = 'genai-dev'
union all
select id, 2, 'RAG at Scale', 'Hybrid search and reranking',
  'Advanced: hybrid retrieval, rerankers, and eval-driven tuning.', 'advanced'
from public.courses where slug = 'genai-dev'
union all
select id, 3, 'Fine-Tuning Strategy', 'When to tune vs RAG',
  'Advanced: dataset design, adapters, and cost/quality trade-offs.', 'advanced'
from public.courses where slug = 'genai-dev'
union all
select id, 4, 'Security Threat Modeling', 'Prompt injection defenses',
  'Advanced: sandboxing, allowlists, and policy enforcement.', 'advanced'
from public.courses where slug = 'genai-dev'
union all
select id, 5, 'Production Observability', 'Quality and drift monitoring',
  'Advanced: feedback loops and human-in-the-loop controls.', 'advanced'
from public.courses where slug = 'genai-dev';

-- Full-Stack AI Engineering
insert into public.modules (course_id, module_number, title, concept, explanation, level_type)
select id, 1, 'AI Product UX', 'Designing for AI uncertainty',
  'Intermediate: UX patterns for AI outputs and confidence.', 'intermediate'
from public.courses where slug = 'fullstack-ai'
union all
select id, 2, 'Backend Orchestration', 'API and workflow design',
  'Intermediate: structuring AI services and async pipelines.', 'intermediate'
from public.courses where slug = 'fullstack-ai'
union all
select id, 3, 'Data Layer', 'Vector stores and caches',
  'Intermediate: choosing storage and caching strategies.', 'intermediate'
from public.courses where slug = 'fullstack-ai'
union all
select id, 4, 'Testing AI Systems', 'Evals and regression tests',
  'Intermediate: test harnesses for model behavior.', 'intermediate'
from public.courses where slug = 'fullstack-ai'
union all
select id, 5, 'Deployment Pipelines', 'Continuous delivery',
  'Intermediate: CI/CD and rollout strategies.', 'intermediate'
from public.courses where slug = 'fullstack-ai'
union all
select id, 1, 'System Design Deep Dive', 'AI-first architecture',
  'Advanced: scaling AI services and multi-tenant design.', 'advanced'
from public.courses where slug = 'fullstack-ai'
union all
select id, 2, 'Latency Engineering', 'Streaming and partial renders',
  'Advanced: low-latency stacks with streaming UI.', 'advanced'
from public.courses where slug = 'fullstack-ai'
union all
select id, 3, 'Cost Controls', 'Token budgeting and caching',
  'Advanced: cost-aware routing and response caching.', 'advanced'
from public.courses where slug = 'fullstack-ai'
union all
select id, 4, 'Security for AI APIs', 'Abuse prevention',
  'Advanced: quotas, auth, and prompt injection mitigation.', 'advanced'
from public.courses where slug = 'fullstack-ai'
union all
select id, 5, 'SRE for AI', 'Reliability and incident response',
  'Advanced: SLOs and production incident playbooks.', 'advanced'
from public.courses where slug = 'fullstack-ai';

-- AI Agents & Autonomous Systems
insert into public.modules (course_id, module_number, title, concept, explanation, level_type)
select id, 1, 'Agent Patterns', 'Planner/Executor loops',
  'Intermediate: core agent loop patterns and tools.', 'intermediate'
from public.courses where slug = 'ai-agents'
union all
select id, 2, 'Tool Use', 'APIs, functions, and plugins',
  'Intermediate: safe tool use and response validation.', 'intermediate'
from public.courses where slug = 'ai-agents'
union all
select id, 3, 'Memory Models', 'Short/long term memory',
  'Intermediate: memory design and retrieval.', 'intermediate'
from public.courses where slug = 'ai-agents'
union all
select id, 4, 'Multi-Agent Systems', 'Roles and coordination',
  'Intermediate: roles, handoffs, and consensus.', 'intermediate'
from public.courses where slug = 'ai-agents'
union all
select id, 5, 'Evaluation', 'Agent success metrics',
  'Intermediate: evals for autonomous behaviors.', 'intermediate'
from public.courses where slug = 'ai-agents'
union all
select id, 1, 'Autonomy Safety', 'Constraint-driven autonomy',
  'Advanced: safe autonomy with guardrails.', 'advanced'
from public.courses where slug = 'ai-agents'
union all
select id, 2, 'Agentic RAG', 'Contextual tool routing',
  'Advanced: knowledge routing and reranking.', 'advanced'
from public.courses where slug = 'ai-agents'
union all
select id, 3, 'Long-Horizon Tasks', 'State and planning',
  'Advanced: task decomposition and retries.', 'advanced'
from public.courses where slug = 'ai-agents'
union all
select id, 4, 'Multi-Agent Orchestration', 'Hierarchies and swarms',
  'Advanced: orchestration patterns for scaling.', 'advanced'
from public.courses where slug = 'ai-agents'
union all
select id, 5, 'Production Agents', 'Monitoring and governance',
  'Advanced: observability and policy compliance.', 'advanced'
from public.courses where slug = 'ai-agents';

-- MLOps & AI Deployment
insert into public.modules (course_id, module_number, title, concept, explanation, level_type)
select id, 1, 'Model Packaging', 'Artifacts and registries',
  'Intermediate: packaging and versioning models.', 'intermediate'
from public.courses where slug = 'mlops-deploy'
union all
select id, 2, 'CI/CD for ML', 'Automated pipelines',
  'Intermediate: build, test, and deploy ML systems.', 'intermediate'
from public.courses where slug = 'mlops-deploy'
union all
select id, 3, 'Monitoring', 'Latency and drift',
  'Intermediate: metrics and anomaly detection.', 'intermediate'
from public.courses where slug = 'mlops-deploy'
union all
select id, 4, 'Data Contracts', 'Schema and quality',
  'Intermediate: data validation and governance.', 'intermediate'
from public.courses where slug = 'mlops-deploy'
union all
select id, 5, 'Rollouts', 'Canary and shadow',
  'Intermediate: safe rollout strategies.', 'intermediate'
from public.courses where slug = 'mlops-deploy'
union all
select id, 1, 'Advanced Deployments', 'Multi-region inference',
  'Advanced: scaling inference globally.', 'advanced'
from public.courses where slug = 'mlops-deploy'
union all
select id, 2, 'Model Governance', 'Compliance and audit',
  'Advanced: traceability and audit trails.', 'advanced'
from public.courses where slug = 'mlops-deploy'
union all
select id, 3, 'Cost Optimization', 'GPU utilization',
  'Advanced: batching and hardware optimization.', 'advanced'
from public.courses where slug = 'mlops-deploy'
union all
select id, 4, 'Online Evaluation', 'A/B and bandits',
  'Advanced: online experiments and bandit testing.', 'advanced'
from public.courses where slug = 'mlops-deploy'
union all
select id, 5, 'Resilience', 'Disaster recovery',
  'Advanced: fallback systems and resilience patterns.', 'advanced'
from public.courses where slug = 'mlops-deploy';

-- Modern Data Engineering
insert into public.modules (course_id, module_number, title, concept, explanation, level_type)
select id, 1, 'Data Lakes', 'Storage architectures',
  'Intermediate: lake vs warehouse trade-offs.', 'intermediate'
from public.courses where slug = 'data-eng'
union all
select id, 2, 'Streaming', 'Real-time pipelines',
  'Intermediate: streaming ingestion and processing.', 'intermediate'
from public.courses where slug = 'data-eng'
union all
select id, 3, 'Transformations', 'ELT and dbt',
  'Intermediate: transformation layers and testing.', 'intermediate'
from public.courses where slug = 'data-eng'
union all
select id, 4, 'Catalogs', 'Metadata and lineage',
  'Intermediate: governance and discoverability.', 'intermediate'
from public.courses where slug = 'data-eng'
union all
select id, 5, 'Data for AI', 'Feature stores',
  'Intermediate: feature pipelines for ML.', 'intermediate'
from public.courses where slug = 'data-eng'
union all
select id, 1, 'Advanced Streaming', 'Exactly-once semantics',
  'Advanced: stateful processing and guarantees.', 'advanced'
from public.courses where slug = 'data-eng'
union all
select id, 2, 'Lakehouse Design', 'Unified analytics',
  'Advanced: lakehouse patterns for AI workloads.', 'advanced'
from public.courses where slug = 'data-eng'
union all
select id, 3, 'Performance Tuning', 'Partitioning and caching',
  'Advanced: query optimization and caching strategies.', 'advanced'
from public.courses where slug = 'data-eng'
union all
select id, 4, 'Data Security', 'Privacy and masking',
  'Advanced: PII handling and compliance.', 'advanced'
from public.courses where slug = 'data-eng'
union all
select id, 5, 'Cost Optimization', 'Compute/storage trade-offs',
  'Advanced: cost controls for large pipelines.', 'advanced'
from public.courses where slug = 'data-eng';

-- Advanced Prompt Engineering
insert into public.modules (course_id, module_number, title, concept, explanation, level_type)
select id, 1, 'Prompt Foundations', 'Instruction hierarchy',
  'Intermediate: hierarchy of prompts and task framing.', 'intermediate'
from public.courses where slug = 'prompt-adv'
union all
select id, 2, 'Few-shot Design', 'Examples as controls',
  'Intermediate: few-shot patterns and pitfalls.', 'intermediate'
from public.courses where slug = 'prompt-adv'
union all
select id, 3, 'Evaluation', 'Prompt scoring',
  'Intermediate: eval metrics and testing harnesses.', 'intermediate'
from public.courses where slug = 'prompt-adv'
union all
select id, 4, 'Tool Prompts', 'Function calling',
  'Intermediate: structured tool calling prompts.', 'intermediate'
from public.courses where slug = 'prompt-adv'
union all
select id, 5, 'Safety Prompts', 'Guardrails',
  'Intermediate: safety and policy prompts.', 'intermediate'
from public.courses where slug = 'prompt-adv'
union all
select id, 1, 'Prompt Programs', 'Composable prompt systems',
  'Advanced: prompt pipelines and templating.', 'advanced'
from public.courses where slug = 'prompt-adv'
union all
select id, 2, 'Adversarial Prompting', 'Robustness',
  'Advanced: defending against prompt attacks.', 'advanced'
from public.courses where slug = 'prompt-adv'
union all
select id, 3, 'Chain Design', 'Reasoning scaffolds',
  'Advanced: chain-of-thought and verification.', 'advanced'
from public.courses where slug = 'prompt-adv'
union all
select id, 4, 'Domain Adaptation', 'Prompt tuning strategies',
  'Advanced: domain-specific prompting strategies.', 'advanced'
from public.courses where slug = 'prompt-adv'
union all
select id, 5, 'Project Capstone', 'Prompt system build',
  'Advanced: build and evaluate a prompt system.', 'advanced'
from public.courses where slug = 'prompt-adv';

-- Structured module content (introduction, examples, practice, summary, objectives, timing)
update public.modules
set
  learning_objectives = coalesce(
    learning_objectives,
    '- Understand the core idea behind ' || title || E'\n- Explain how ' || concept || ' applies in real projects' ||
    E'\n- Apply this concept to a small, real-world scenario'
  ),
  introduction = coalesce(
    introduction,
    'In this module we introduce ' || concept || '. You will learn what it is, why it matters, and how it connects to the previous module.'
  ),
  examples = coalesce(
    examples,
    'Real-world example: teams use ' || concept || ' when building systems that must be reliable, fast, and easy to maintain. ' ||
    'You will see how this idea shows up in products and production workflows.'
  ),
  summary = coalesce(
    summary,
    '- ' || concept || ' defined in simple language' ||
    E'\n- When to use it and when it is not needed' ||
    E'\n- One practical way to apply it today'
  ),
  estimated_time = coalesce(
    estimated_time,
    case
      when level_type = 'beginner' then 15
      when level_type = 'intermediate' then 20
      else 25
    end
  ),
  practice_questions = coalesce(
    practice_questions,
    jsonb_build_array(
      jsonb_build_object(
        'question', 'Which option best describes ' || concept || '?',
        'options', jsonb_build_array(concept, 'A UI theme', 'A payment method', 'A logging format'),
        'correct', concept,
        'explanation', 'The concept itself is the most accurate description.'
      ),
      jsonb_build_object(
        'question', 'Why does ' || concept || ' matter in this module?',
        'options', jsonb_build_array('It addresses the core problem', 'It only changes colors', 'It avoids testing', 'It removes documentation'),
        'correct', 'It addresses the core problem',
        'explanation', 'The concept matters because it solves the main problem covered in this module.'
      )
    )
  ),
  practice_answers = coalesce(
    practice_answers,
    jsonb_build_array(concept, 'It addresses the core problem')
  ),
  advanced_content = case
    when level_type = 'advanced' then coalesce(
      advanced_content,
      'Advanced deep dive: explore edge cases, trade-offs, and system design decisions for ' || concept || '. ' ||
      'Consider performance, reliability, safety, and cost at scale.'
    )
    else advanced_content
  end;

-- Quizzes (5 per course)
insert into public.quizzes (course_id, question, options, correct_answer, explanation)
select id, 'Which model type is best for generating images?', '["LLM","Diffusion","Graph","Recommender"]'::jsonb, 'Diffusion',
  'Diffusion models are commonly used for image generation.'
from public.courses where slug = 'genai-dev'
union all
select id, 'What does RAG stand for?', '["Retrieve and Generate","Rank and Ground","Read and Generate","Route and Ground"]'::jsonb, 'Retrieve and Generate',
  'RAG combines retrieval with generation.'
from public.courses where slug = 'genai-dev'
union all
select id, 'Why use prompt templates?', '["Lower latency","Consistency","More GPU","No evals needed"]'::jsonb, 'Consistency',
  'Templates enforce consistent behavior.'
from public.courses where slug = 'genai-dev'
union all
select id, 'What is a guardrail?', '["UI feature","Safety constraint","Database index","Embedding model"]'::jsonb, 'Safety constraint',
  'Guardrails prevent unsafe outputs.'
from public.courses where slug = 'genai-dev'
union all
select id, 'What helps reduce cost?', '["No caching","Batching","Longer prompts","No limits"]'::jsonb, 'Batching',
  'Batching reduces compute overhead.'
from public.courses where slug = 'genai-dev'
union all
select id, 'Which layer handles AI workflow?', '["Database","Backend orchestration","CSS","Browser cache"]'::jsonb, 'Backend orchestration',
  'Orchestration manages AI tasks.'
from public.courses where slug = 'fullstack-ai'
union all
select id, 'Why use evals?', '["Decoration","Measure AI quality","Disable testing","Avoid logging"]'::jsonb, 'Measure AI quality',
  'Evals quantify model behavior.'
from public.courses where slug = 'fullstack-ai'
union all
select id, 'What optimizes latency?', '["Streaming responses","Blocking calls","No caching","No APIs"]'::jsonb, 'Streaming responses',
  'Streaming reduces time-to-first-token.'
from public.courses where slug = 'fullstack-ai'
union all
select id, 'What is a vector store used for?', '["Images","Embeddings retrieval","Auth","Payments"]'::jsonb, 'Embeddings retrieval',
  'Vector stores retrieve similar embeddings.'
from public.courses where slug = 'fullstack-ai'
union all
select id, 'Why budget tokens?', '["More errors","Control cost","Slow requests","None"]'::jsonb, 'Control cost',
  'Token budgeting keeps costs predictable.'
from public.courses where slug = 'fullstack-ai'
union all
select id, 'Agent loops usually involve?', '["Plan and execute","Only UI","No memory","Static scripts"]'::jsonb, 'Plan and execute',
  'Agents typically plan then execute tasks.'
from public.courses where slug = 'ai-agents'
union all
select id, 'What is tool use?', '["Manual copy","API invocation","CSS styling","Database cleanup"]'::jsonb, 'API invocation',
  'Tools let agents call external APIs.'
from public.courses where slug = 'ai-agents'
union all
select id, 'Why memory?', '["Store context","Increase CSS","No benefit","Stop agents"]'::jsonb, 'Store context',
  'Memory keeps important context.'
from public.courses where slug = 'ai-agents'
union all
select id, 'Multi-agent systems need?', '["Coordination","No rules","Single user","No tools"]'::jsonb, 'Coordination',
  'Agents must coordinate roles.'
from public.courses where slug = 'ai-agents'
union all
select id, 'Agent evals measure?', '["GPU","Success rate","Fonts","Disk"]'::jsonb, 'Success rate',
  'Evals quantify success metrics.'
from public.courses where slug = 'ai-agents'
union all
select id, 'CI/CD in MLOps is for?', '["Manual deploys","Automation","UI design","Password resets"]'::jsonb, 'Automation',
  'CI/CD automates build and release.'
from public.courses where slug = 'mlops-deploy'
union all
select id, 'What is model drift?', '["Stable model","Performance shift","UI change","No data"]'::jsonb, 'Performance shift',
  'Drift means model performance changes.'
from public.courses where slug = 'mlops-deploy'
union all
select id, 'Canary deployment means?', '["All users","Small subset","No deploy","Delete model"]'::jsonb, 'Small subset',
  'Canaries roll out to a subset first.'
from public.courses where slug = 'mlops-deploy'
union all
select id, 'Data contracts ensure?', '["Schema quality","No logs","Less data","More bugs"]'::jsonb, 'Schema quality',
  'Contracts keep data reliable.'
from public.courses where slug = 'mlops-deploy'
union all
select id, 'Why monitoring?', '["Reduce visibility","Detect issues","Add latency","Ignore errors"]'::jsonb, 'Detect issues',
  'Monitoring detects failures and drift.'
from public.courses where slug = 'mlops-deploy'
union all
select id, 'Lake vs warehouse relates to?', '["Storage style","UI theme","CPU","NoSQL"]'::jsonb, 'Storage style',
  'Lakes and warehouses differ in storage patterns.'
from public.courses where slug = 'data-eng'
union all
select id, 'Streaming pipelines are for?', '["Batch only","Real-time data","Static files","No data"]'::jsonb, 'Real-time data',
  'Streaming handles real-time data.'
from public.courses where slug = 'data-eng'
union all
select id, 'What is dbt?', '["GPU","Transformation tool","Browser","Cache"]'::jsonb, 'Transformation tool',
  'dbt is used for transformations.'
from public.courses where slug = 'data-eng'
union all
select id, 'Feature stores help with?', '["Training features","UI icons","Payments","Auth"]'::jsonb, 'Training features',
  'Feature stores manage ML features.'
from public.courses where slug = 'data-eng'
union all
select id, 'Metadata catalogs provide?', '["Lineage","Images","Passwords","None"]'::jsonb, 'Lineage',
  'Catalogs track lineage and metadata.'
from public.courses where slug = 'data-eng'
union all
select id, 'Prompt hierarchy starts with?', '["System","User","Tool","None"]'::jsonb, 'System',
  'System prompts provide top-level rules.'
from public.courses where slug = 'prompt-adv'
union all
select id, 'Few-shot prompts use?', '["Examples","No context","Only code","Images"]'::jsonb, 'Examples',
  'Few-shot prompting provides examples.'
from public.courses where slug = 'prompt-adv'
union all
select id, 'Prompt evaluation is for?', '["Fun","Quality measurement","Avoid tests","None"]'::jsonb, 'Quality measurement',
  'Evals measure prompt quality.'
from public.courses where slug = 'prompt-adv'
union all
select id, 'Tool prompts enable?', '["Function calling","No ops","GPU","No output"]'::jsonb, 'Function calling',
  'Tool prompts structure function calls.'
from public.courses where slug = 'prompt-adv'
union all
select id, 'Safety prompts are used to?', '["Remove UI","Prevent unsafe outputs","Add latency","Disable logging"]'::jsonb, 'Prevent unsafe outputs',
  'Safety prompts reduce unsafe outputs.'
from public.courses where slug = 'prompt-adv';
