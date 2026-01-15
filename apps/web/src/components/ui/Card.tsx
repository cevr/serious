import type { JSX } from "solid-js"
import "./Card.css"

interface CardProps {
  children: JSX.Element
  class?: string
  onClick?: () => void
  interactive?: boolean
}

export function Card(props: CardProps) {
  return (
    <div
      class={`card ${props.interactive ? "card--interactive" : ""} ${props.class ?? ""}`}
      onClick={props.onClick}
      role={props.onClick ? "button" : undefined}
      tabIndex={props.onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (props.onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          props.onClick()
        }
      }}
    >
      {props.children}
    </div>
  )
}

interface CardHeaderProps {
  children: JSX.Element
  class?: string
}

export function CardHeader(props: CardHeaderProps) {
  return <div class={`card__header ${props.class ?? ""}`}>{props.children}</div>
}

interface CardBodyProps {
  children: JSX.Element
  class?: string
}

export function CardBody(props: CardBodyProps) {
  return <div class={`card__body ${props.class ?? ""}`}>{props.children}</div>
}

interface CardFooterProps {
  children: JSX.Element
  class?: string
}

export function CardFooter(props: CardFooterProps) {
  return <div class={`card__footer ${props.class ?? ""}`}>{props.children}</div>
}
