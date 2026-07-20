{{- define "blekline-ingress.name" -}}
blekline-ingress
{{- end }}

{{- define "blekline-ingress.fullname" -}}
{{ .Release.Name }}-blekline-ingress
{{- end }}

{{- define "blekline-ingress.secretName" -}}
{{- if .Values.secrets.existingSecret -}}
{{ .Values.secrets.existingSecret }}
{{- else -}}
{{ include "blekline-ingress.fullname" . }}-secret
{{- end -}}
{{- end }}
