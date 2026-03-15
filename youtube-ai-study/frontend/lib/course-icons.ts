import {
  Brain,
  Cpu,
  LineChart,
  Shield,
  Globe,
  Cloud,
  Blocks,
  Sparkles,
  Code,
  Server,
  Database,
  Workflow,
} from "lucide-react";

export function getCourseIcon(name: string) {
  switch (name) {
    case "Brain":
      return Brain;
    case "Cpu":
      return Cpu;
    case "LineChart":
      return LineChart;
    case "Shield":
      return Shield;
    case "Globe":
      return Globe;
    case "Cloud":
      return Cloud;
    case "Blocks":
      return Blocks;
    case "Sparkles":
      return Sparkles;
    case "Code":
      return Code;
    case "Server":
      return Server;
    case "Database":
      return Database;
    case "Workflow":
      return Workflow;
    default:
      return Sparkles;
  }
}
