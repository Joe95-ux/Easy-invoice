import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type FormCardProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function FormCard({
  title,
  description,
  children,
  footer,
  className,
  bodyClassName,
}: FormCardProps) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      {title && (
        <CardHeader className="border-b py-4">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={cn("py-6", bodyClassName)}>{children}</CardContent>
      {footer && (
        <CardFooter className="border-t py-4">{footer}</CardFooter>
      )}
    </Card>
  );
}
