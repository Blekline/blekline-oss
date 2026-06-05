{{- define "blekline-ingress.name" -}}
blekline-ingress
{{- end }}

{{- define "blekline-ingress.fullname" -}}
{{ .Release.Name }}-blekline-ingress
{{- end }}
