#!/usr/bin/env python3
"""
Traductor de strings chinos a espanol para archivos .ts/.tsx.
Modo dry-run por defecto. Usar --apply para aplicar cambios.
Solo reemplaza palabras chinas completas (no parte de identificadores).
"""

import re
import sys
import shutil
from pathlib import Path

# Forzar UTF-8 en stdout para Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

# Diccionario chino -> espanol
# Basado en los strings extraidos del proyecto
TRADUCCIONES = {
    # UI - Botones y acciones
    "上传按钮同行": "Boton de subir en la misma linea",
    "上传": "Subir",
    "下拉": "Desplegable",
    "不再": "Ya no",
    "不展示可切换的下拉": "No mostrar el desplegable intercambiable",
    "不显分类筛选": "No mostrar filtro de categoria",
    "专门法院": "Tribunal especial",
    "专项": "Especial",
    "争议解决机构按管辖地匹配": "Institucion de resolucion de disputas segun jurisdiccion",
    "从模板新建文书": "Nuevo documento desde plantilla",
    "仲裁": "Arbitraje",
    "仲裁含诉讼地位列": "Arbitraje incluye columna de posicion procesal",
    
    # Categorias
    "一审判决支持原告诉请": "Sentencia de primera instancia acepta la demanda del actor",
    "上传按钮同行": "Boton de subir en la misma linea",
    
    # Campos
    "名称": "Nombre",
    "类型暂无可用模板": "No hay plantillas disponibles para este tipo",
    "标题": "Titulo",
    "标题自动生成": "Titulo generado automaticamente",
    "案情信息": "Informacion del caso",
    "案由": "Causa",
    "案由后按": "Causa seguida por",
    "案由推荐": "Recomendacion de causa",
    "标的描述": "Descripcion del objeto",
    "标的额": "Monto del objeto",
    "案件": "Caso",
    
    # Actores
    "委托人": "Cliente",
    "委托方": "Parte comitente",
    "委托方与相对方": "Parte comitente y contraparte",
    "委托方恒为": "La parte comitente es siempre",
    "委托方行恒为": "La fila de la parte comitente es siempre",
    "对方": "Contraparte",
    "对方当事人": "Contraparte",
    "对方未上诉": "La contraparte no apelo",
    "相关方": "Parte relacionada",
    "相关方录入表格": "Tabla de carga de partes relacionadas",
    "相对方": "Contraparte",
    "相对方按需添加": "Contraparte agregada segun necesidad",
    "第三人": "Tercero",
    "当事人": "Parte",
    "律师费": "Honorarios",
    "顾问": "Asesor",
    "顾问信息": "Informacion del asesor",
    "顾问单位": "Unidad asesora",
    "顾问类只显示委托方": "Categoria asesor solo muestra la parte comitente",
    "同事列表": "Lista de colegas",
    
    # Operaciones
    "生成": "Generar",
    "生成并下载": "Generar y descargar",
    "重新拉历史": "Volver a cargar historial",
    "重命名为": "Renombrar a",
    "重定向": "Redirigir",
    "重定向给旧": "Redirigir al anterior",
    "拉历史": "Cargar historial",
    "历史": "Historial",
    "历史查询": "Consulta de historial",
    "查": "Buscar",
    "筛选": "Filtrar",
    "进一步筛选": "Filtrar mas",
    "分类": "Categoria",
    "分类筛选": "Filtro de categoria",
    "分组统计": "Estadisticas agrupadas",
    "切换是高频": "El cambio es de alta frecuencia",
    "自动": "Automatico",
    "自动勾选": "Marcar automaticamente",
    "自动打开": "Abrir automaticamente",
    "自动生成": "Generar automaticamente",
    "默认": "Por defecto",
    "默认用文件名": "Por defecto usar el nombre del archivo",
    "默认只留委托方一行": "Por defecto dejar solo una fila de la parte comitente",
    "设默认": "Establecer por defecto",
    "手动补": "Completar manualmente",
    "手动": "Manual",
    
    # Documentos
    "文档": "Documento",
    "文档列表": "Lista de documentos",
    "文档列表显示": "La lista de documentos muestra",
    "文书": "Documento",
    "文书模板": "Plantilla de documento",
    "材料清单": "Lista de materiales",
    "材料": "Material",
    "证据材料": "Material probatorio",
    "诉讼文书": "Documento procesal",
    "诉讼请求": "Peticion procesal",
    "诉讼": "Proceso judicial",
    "诉讼地位也随当前程序联动": "La posicion procesal tambien se actualiza con el proceso actual",
    "裁判文书": "Documento judicial",
    "合同": "Contrato",
    "扫描件合同": "Contrato escaneado",
    "上传扫描件合同": "Subir contrato escaneado",
    "起诉状": "Demanda",
    "申请书": "Solicitud",
    "申请": "Solicitar",
    "申请开具": "Solicitar emision",
    "申请开票": "Solicitar facturacion",
    "开票": "Facturacion",
    "开票申请": "Solicitud de facturacion",
    "开票申请已": "Solicitud de facturacion ya",
    "开具增值税专用": "Emitir IVA especial",
    "还没有开票申请": "Todavia no hay solicitud de facturacion",
    "请填写有效的开票": "Por favor complete una factura valida",
    "税号": "CUIT",
    "抬头": "Encabezado",
    "发票": "Factura",
    "收据": "Recibo",
    
    # Estado y workflow
    "待": "Pendiente",
    "缺失": "Faltante",
    "缺": "Falta",
    "有": "Tiene",
    "无": "Sin",
    "无内容": "Sin contenido",
    "无诉讼地位": "Sin posicion procesal",
    "未有": "Sin",
    "还没": "Todavia no",
    "还没记录时整张卡片不渲染": "Si no hay registros, la tarjeta entera no se renderiza",
    "还没有时间线事件": "Todavia no hay eventos en la linea de tiempo",
    "已完成": "Completado",
    "完成": "Completar",
    "处理": "Procesar",
    "审查": "Revision",
    "审查支持的": "Revision soportada",
    "新审查入口": "Nueva entrada de revision",
    "新审查已落库": "Nueva revision guardada",
    "次审查": "Siguiente revision",
    "复检入口暂隐": "Entrada de rechequeo temporalmente oculta",
    "复检功能暂时隐藏": "Funcion de rechequeo temporalmente oculta",
    "不阻塞新审查": "No bloquear la nueva revision",
    "生效": "Vigente",
    "已生成": "Ya generado",
    "已上传材料的": "De los materiales ya subidos",
    "已锁定": "Ya bloqueado",
    "已存在": "Ya existe",
    "已": "Ya",
    
    # Archivo
    "归档": "Archivar",
    "归档到哪个卷宗": "A que expediente archivar",
    "并归档": "Y archivar",
    "卷宗": "Expediente",
    "卷宗联动预填": "Prellenado vinculado al expediente",
    "卷宗树": "Arbol de expedientes",
    "选卷宗": "Elegir expediente",
    "选模板": "Elegir plantilla",
    "模板": "Plantilla",
    "模板相关的共享类型": "Tipos compartidos relacionados con plantillas",
    "按模板大类推荐": "Recomendar por categoria de plantilla",
    "卡内的新建": "Nuevo dentro de la tarjeta",
    "新建": "Nuevo",
    
    # Lista
    "列表": "Lista",
    "列表已合并到": "Lista ya fusionada en",
    "列表显示": "Lista muestra",
    "表格": "Tabla",
    "表头": "Encabezado",
    "表筛": "Filtro de tabla",
    "表": "Tabla",
    
    # Riesgo
    "风险": "Riesgo",
    "高风险": "Riesgo alto",
    "中风险": "Riesgo medio",
    "低风险": "Riesgo bajo",
    "红色": "Rojo",
    "警告": "Advertencia",
    
    # Vistas
    "详情": "Detalle",
    "详情页": "Pagina de detalle",
    "详情页发起时": "Cuando se inicia desde la pagina de detalle",
    "详情页是服务端组件": "La pagina de detalle es un componente de servidor",
    "列表已合并到": "Lista ya fusionada en",
    "跳到": "Ir a",
    "跳转": "Redirigir",
    "打开": "Abrir",
    "打开弹窗": "Abrir dialogo",
    "弹窗时再清": "Limpiar al abrir el dialogo",
    "打断打开": "Interrumpir apertura",
    "抽屉": "Panel lateral",
    "收案抽屉所需": "Necesario para el panel lateral de recepcion",
    "抽屉列表": "Lista del panel lateral",
    
    # Fechas
    "最近": "Reciente",
    "最新": "Mas reciente",
    "最新动态在上": "Lo mas reciente arriba",
    "按发生时间倒序": "Orden descendente por fecha",
    "重要时限": "Plazo importante",
    "案时间止": "Hasta fecha del caso",
    "案时间起": "Desde fecha del caso",
    
    # Personas
    "某某公司": "Empresa X",
    "公司": "Empresa",
    "自然人": "Persona fisica",
    "法人": "Persona juridica",
    
    # Admin
    "主办": "Responsable",
    "协办": "Asistente",
    "经办": "Operador",
    "后端": "Backend",
    "前端判断是否亮按钮": "El frontend determina si iluminar el boton",
    "前端": "Frontend",
    "白名单内的": "De la lista blanca",
    "白名单": "Lista blanca",
    "允许重复选同一文件": "Permitir elegir el mismo archivo dos veces",
    "共用": "Compartido",
    "复用": "Reutilizar",
    "复用现有": "Reutilizar existente",
    "按类别复用": "Reutilizar por categoria",
    "取": "Tomar",
    "换": "Cambiar",
    "改用": "Cambiar a",
    
    # Texto UI
    "请选择": "Seleccione",
    "选择": "Seleccionar",
    "填入": "Completar",
    "填到": "Completar en",
    "填完当事人": "Completar partes",
    "留空即可": "Dejar vacio esta bien",
    "去后缀": "Quitar sufijo",
    "变量": "Variable",
    "哪些变量允许行内补全": "Que variables permiten autocompletado inline",
    "行内补全": "Autocompletado inline",
    "补全可能缺失的字段": "Completar campos posiblemente faltantes",
    "补齐": "Completar",
    "进一步": "Mas",
    "只能": "Solo puede",
    "只列文件": "Solo listar archivos",
    "只在新程序下不合法时清空": "Limpiar solo cuando es invalido bajo el nuevo proceso",
    "只在新程序下": "Solo bajo el nuevo proceso",
    "仅在为空时": "Solo cuando esta vacio",
    "仅当": "Solo cuando",
    "即写即存源表": "Escribir y guardar en la tabla origen",
    "这些字段会即时写入源表": "Estos campos se escriben inmediatamente en la tabla origen",
    "从": "Desde",
    "从模板新建": "Nuevo desde plantilla",
    "另起一个裸": "Iniciar un nuevo desnudo",
    "保存": "Guardar",
    "取消": "Cancelar",
    "确认": "Confirmar",
    "删除": "Eliminar",
    "创建": "Crear",
    "编辑": "Editar",
    "修改": "Modificar",
    "查看": "Ver",
    "返回": "Volver",
    "继续": "Continuar",
    "提交": "Enviar",
    "关闭": "Cerrar",
    "移除": "Quitar",
    "添加": "Agregar",
    "新增": "Agregar",
    
    # Extras
    "信息": "Informacion",
    "说明": "Descripcion",
    "提示": "Aviso",
    "注意": "Atencion",
    "类型": "Tipo",
    "状态": "Estado",
    "阶段": "Etapa",
    "阶段款": "Pago por etapa",
    "项目信息": "Informacion del proyecto",
    "制度规范独立页": "Pagina independiente de normas institucionales",
    "快递跟踪恢复独立页": "Seguimiento de envios restaurado como pagina independiente",
    "通讯录独立页": "Pagina independiente de contactos",
    "独立页": "Pagina independiente",
    "联系人": "Contacto",
    "联系人列表": "Lista de contactos",
    "快递": "Envio",
    "跟踪": "Seguimiento",
    
    # Comentarios de codigo
    "联动": "Vinculacion",
    "联动提示": "Aviso de vinculacion",
    "后联动": "Vinculacion posterior",
    "并": "Y",
    "与": "Y",
    "与类别等宽": "Mismo ancho que la categoria",
    "与旧": "Con el anterior",
    "后由": "Despues por",
    "下的": "De la categoria",
    "下列": "Siguiente",
    "下": "Abajo",
    "上": "Arriba",
    "顶部": "Parte superior",
    "右侧": "Derecha",
    "左侧": "Izquierda",
    "对齐": "Alinear",
    "保证视觉一致": "Garantizar consistencia visual",
    "注意视觉": "Cuidar la visual",
    "入口": "Entrada",
    "入场动画只会让它显得迟钝": "La animacion de entrada solo lo hace ver lento",
    "故不加动效": "Por eso no se agrega animacion",
    "图标在这里定型": "El icono se define aqui",
    "导致图标配置失效": "Provoca que la configuracion del icono no funcione",
    "这里包一层": "Envolver aqui una capa",
    "这里": "Aqui",
    "避免再出现": "Evitar que vuelva a aparecer",
    "避免出现没按钮的空提示": "Evitar avisos vacios sin boton",
    "避免": "Evitar",
    "那是收案阶段": "Esa es la etapa de recepcion",
    "收案": "Recepcion de caso",
    "收案列表": "Lista de recepcion de casos",
    "收案时间止": "Hasta fecha de recepcion",
    "收案时间起": "Desde fecha de recepcion",
    "案卷": "Expediente",
    "案卷材料": "Materiales del expediente",
    "提示先去案卷材料上传": "Avisar primero de subir materiales del expediente",
    "从案卷详情页发起时": "Cuando se inicia desde la pagina de detalle del expediente",
    "案卷详情页": "Pagina de detalle del expediente",
    "案件详情页": "Pagina de detalle del caso",
    "case 已锁定": "El caso esta bloqueado",
    "case": "Caso",
    "但以下字段为空需手动补": "Pero los siguientes campos estan vacios y deben completarse manualmente",
    "字段": "Campo",
    "该字段": "Ese campo",
    "此字段": "Este campo",
    "含未限定类别的": "Incluye de categoria no limitada",
    "含": "Incluye",
    "不含空格": "Sin espacios",
    "不含": "Sin",
    "长度": "Longitud",
    "字符": "Caracter",
    "字符串": "Cadena de texto",
    "位含字母通常是社会信用代码": "Con letras generalmente es CUIT",
    "社会信用代码": "CUIT",
    "证件号": "Numero de documento",
    "证件号必填由": "Numero de documento requerido por",
    "对每行统一校验": "Validar uniformemente cada fila",
    "校验": "Validar",
    "对每行": "Para cada fila",
    "是否反诉": "Si es reconvencion",
    "是否需向律协备案": "Si requiere registro en el colegio de abogados",
    "律协": "Colegio de abogados",
    "备案": "Registro",
    "是否在列表中": "Si esta en la lista",
    "是否存在猜主体类型": "Si existe para adivinar el tipo de sujeto",
    "猜主体类型": "Adivinar tipo de sujeto",
    "按": "Segun",
    "按类别": "Por categoria",
    "按需": "Segun necesidad",
    "按需添加": "Agregar segun necesidad",
    "共": "Total",
    "份": "Copias",
    "份文档": "Documentos",
    "条": "Elementos",
    "次": "Veces",
    "段": "Parrafo",
    "栏": "Columna",
    "行": "Fila",
    "页码": "Numero de pagina",
    "顶部": "Parte superior",
    "底部": "Parte inferior",
    "自动带出": "Traer automaticamente",
    "下次自动带出": "Traer automaticamente la proxima vez",
    "每次": "Cada vez",
    "每次选": "Cada vez que se elige",
    "是否": "Si",
    "的": "de",
    "和": "y",
    "或": "o",
    "在": "en",
    "中": "en",
    "为": "es",
    "到": "a",
    "对": "a",
    "用": "usar",
    "给": "a",
    "让": "hacer",
    "把": "poner",
    "被": "por",
    "将": "va a",
    "等": "etc",
    "等等": "etc",
    "所以": "por eso",
    "因为": "porque",
    "如果": "si",
    "否则": "sino",
    "但是": "pero",
    "而且": "y ademas",
    "或者": "o",
    "以及": "y",
    "同时": "al mismo tiempo",
    "之后": "despues",
    "之前": "antes",
    "现在": "ahora",
    "已经": "ya",
    "还在": "todavia",
    "还要": "tambien",
    "还需": "todavia falta",
    "还需手动": "todavia falta manualmente",
    "需要": "necesita",
    "必需": "requerido",
    "必填": "obligatorio",
    "可选": "opcional",
    "选填": "opcional",
    "留空": "dejar vacio",
    "空": "vacio",
    "满": "completo",
    "新增": "Agregar",
    "更新": "Actualizar",
    "下载": "Descargar",
    "上传": "Subir",
    "导出": "Exportar",
    "导入": "Importar",
    "打印": "Imprimir",
    "发送": "Enviar",
    "接收": "Recibir",
    "通知": "Notificacion",
    "消息": "Mensaje",
    "提醒": "Recordatorio",
    "事件": "Evento",
    "动态": "Novedad",
    "时间线": "Linea de tiempo",
    "时间": "Tiempo",
    "日期": "Fecha",
    "开始": "Inicio",
    "结束": "Fin",
    "创建时间": "Fecha de creacion",
    "更新时间": "Fecha de actualizacion",
    "最后": "Ultimo",
    "首个": "Primero",
    "整个": "Entero",
    "所有": "Todos",
    "每": "Cada",
    "各": "Cada",
    "某": "Cierto",
    "这些": "Estos",
    "那些": "Aquellos",
    "这个": "Este",
    "那个": "Aquel",
    "什么": "Que",
    "怎么": "Como",
    "为什么": "Por que",
    "哪里": "Donde",
    "何时": "Cuando",
    "多少": "Cuanto",
    # Faltantes - comentarios y strings
    "不按": "No segun",
    "产品要求": "Requisito del producto",
    "会上传扫描件合同": "Subira contrato escaneado",
    "保留": "Conservar",
    "全站": "Todo el sitio",
    "其他": "Otros",
    "其余进": "El resto entra",
    "决定表单结构": "Determina la estructura del formulario",
    "切程序时自动填充建议机构": "Al cambiar de proceso, autocompletar institucion sugerida",
    "切类别时同步当事人行": "Al cambiar de categoria, sincronizar filas de partes",
    "切类别时如果当前程序不在新类别列表里": "Al cambiar de categoria, si el proceso actual no esta en la lista de la nueva categoria",
    "列出该模板的可": "Listar los disponibles de esa plantilla",
    "判决于": "Sentencia en",
    "剩余": "Restante",
    "可上传起诉状": "Puede subir demanda",
    "可被": "Puede ser",
    "右侧文档列表": "Lista de documentos a la derecha",
    "商事仲裁下选了法院": "Bajo arbitraje comercial se selecciono el tribunal",
    "如": "Como",
    "如已存在": "Si ya existe",
    "左侧卷宗树": "Arbol de expedientes a la izquierda",
    "并入基本信息": "Fusionar con informacion basica",
    "异地仲裁委不在生成列表里": "Tribunal de arbitraje externo no esta en la lista generada",
    "当前程序下可选诉讼地位": "Posiciones procesales disponibles bajo el proceso actual",
    "当前类别下可选程序": "Procesos disponibles bajo la categoria actual",
    "当前要展示的": "Lo que se muestra actualmente",
    "我方为被动方时": "Cuando somos la parte pasiva",
    "抽到": "Extraido a",
    "拆回顶层": "Separar al nivel superior",
    "拼出实际入库的": "Concatenar lo que realmente se guarda",
    "排除": "Excluir",
    "改回时去掉此": "Al revertir, quitar esto",
    "文件选择": "Seleccion de archivo",
    "时": "Cuando",
    "时按": "Cuando por",
    "时点上方": "Punto de tiempo arriba",
    "时触发": "Se dispara cuando",
    "曾并入": "Anteriormente fusionado con",
    "最多": "Maximo",
    "机构可自由手输": "La institucion se puede ingresar libremente",
    "样式": "Estilo",
    "没记录时整张卡片不渲染": "Si no hay registros, no renderizar la tarjeta entera",
    "流提示": "Aviso de flujo",
    "清": "Limpiar",
    "清掉": "Limpiar",
    "现拆回": "Ahora separado de vuelta",
    "用于上传时分类": "Usado para clasificar al subir",
    "用户手改后不再覆盖": "Despues de la edicion manual del usuario, no sobrescribir",
    "电子": "Electronico",
    "确保至少有一个相对方行": "Asegurar al menos una fila de contraparte",
    "程序性材料": "Material procesal",
    "端": "Lado",
    "类别": "Categoria",
    "类别的模板": "Plantilla de la categoria",
    "老": "Viejo",
    "覆盖": "Sobrescribir",
    "览": "Vista",
    "触发下载": "Disparar descarga",
    "识别对方": "Identificar contraparte",
    "识别案由": "Identificar causa",
    "该": "Ese",
    "调用方只传位置一类的布局参数": "El llamador solo pasa parametros de layout como posicion",
    "适用本": "Aplicable a este",
    "里的": "Dentro de",
    "非诉": "No litigioso",
}


# Patron de caracteres chinos
CHINO = re.compile(r'[\u4e00-\u9fff]+')


def traducir_archivo(path: Path, apply: bool = False) -> tuple[int, list]:
    """Lee un archivo, reemplaza chino, devuelve (cantidad, cambios)."""
    try:
        contenido = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        print(f"  [SKIP] No es UTF-8: {path}")
        return 0, []
    
    cambios = []
    def reemplazar(match):
        palabra = match.group(0)
        if palabra in TRADUCCIONES:
            traduccion = TRADUCCIONES[palabra]
            cambios.append((palabra, traduccion))
            return traduccion
        else:
            cambios.append((palabra, f"<SIN TRADUCCION: {palabra}>"))
            return palabra
    
    nuevo = CHINO.sub(reemplazar, contenido)
    
    if apply and nuevo != contenido:
        path.write_text(nuevo, encoding='utf-8')
    
    return len(cambios), cambios


def main():
    apply = '--apply' in sys.argv
    mode = "APLICAR" if apply else "DRY-RUN (no modifica archivos)"
    
    print(f"=== Traductor de chino - Modo: {mode} ===\n")
    
    src = Path("src")
    if not src.exists():
        print("ERROR: no existe la carpeta src/")
        sys.exit(1)
    
    total_archivos = 0
    total_cambios = 0
    sin_traduccion = set()
    archivos_modificados = []
    
    for path in src.rglob("*"):
        if path.suffix not in (".ts", ".tsx"):
            continue
        try:
            contenido = path.read_text(encoding='utf-8')
        except Exception:
            continue
        if not CHINO.search(contenido):
            continue
        
        n, cambios = traducir_archivo(path, apply=apply)
        if n > 0:
            total_archivos += 1
            total_cambios += n
            archivos_modificados.append(str(path))
            print(f"[{n:3d}] {path}")
            for orig, trad in cambios:
                if trad.startswith("<SIN TRADUCCION:"):
                    sin_traduccion.add(orig)
                else:
                    print(f"       '{orig}' -> '{trad}'")
    
    print(f"\n=== RESUMEN ===")
    print(f"Archivos con chino: {total_archivos}")
    print(f"Total cambios: {total_cambios}")
    
    if sin_traduccion:
        print(f"\n=== SIN TRADUCCION ({len(sin_traduccion)}) ===")
        for s in sorted(sin_traduccion):
            print(f"  {s}")
    else:
        print("\nTodas las palabras fueron traducidas.")
    
    if not apply:
        print(f"\nPara aplicar los cambios: python traducir_chino.py --apply")


if __name__ == "__main__":
    main()