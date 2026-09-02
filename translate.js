const fs = require("fs");
const path = require("path");

// Diccionario de traducciones (agregá los términos que veas en chino)
const translations = {
  // Generales
  登录: "Iniciar sesión",
  注册: "Registrarse",
  用户名: "Usuario",
  密码: "Contraseña",
  邮箱: "Email",
  案件: "Caso",
  律师: "Abogado",
  客户: "Cliente",
  设置: "Configuración",
  退出: "Cerrar sesión",
  管理: "Administrar",
  系统: "Sistema",
  通知: "Notificaciones",
  报告: "Informe",
  搜索: "Buscar",
  添加: "Agregar",
  编辑: "Editar",
  删除: "Eliminar",
  保存: "Guardar",
  取消: "Cancelar",
  确定: "Aceptar",
  关闭: "Cerrar",
  返回: "Volver",
  下一步: "Siguiente",
  上一步: "Anterior",
  提交: "Enviar",
  重新加载: "Recargar",
  加载: "Cargar",
  创建: "Crear",
  更新: "Actualizar",
  总: "Total",
  今天: "Hoy",
  明天: "Mañana",
  昨天: "Ayer",
  一月: "Enero",
  二月: "Febrero",
  三月: "Marzo",
  四月: "Abril",
  五月: "Mayo",
  六月: "Junio",
  七月: "Julio",
  八月: "Agosto",
  九月: "Septiembre",
  十月: "Octubre",
  十一月: "Noviembre",
  十二月: "Diciembre",
  名称: "Nombre",
  编码: "Código",
  状态: "Estado",
  日期: "Fecha",
  描述: "Descripción",
  备注: "Observaciones",
  操作: "Acciones",
  查看: "Ver",

  // Login
  请填写有效邮箱: "Ingresá un email válido",
  请填写密码: "Ingresá tu contraseña",
  邮箱或密码错误: "Email o contraseña incorrectos",
  隐藏密码: "Ocultar contraseña",
  显示密码: "Mostrar contraseña",
  "登录中...": "Iniciando sesión...",
  "忘记密码？联系系统管理员重置":
    "¿Olvidaste tu contraseña? Contactá al administrador",
  欢迎回来: "Bienvenido",
  用您的工作邮箱登录: "Ingresá con tu email de trabajo",

  // Dashboard
  待我处理: "Pendientes",
  全部: "Ver todos",
  暂无待处理事项: "No hay pendientes",
  "保全到期 / 未读法院短信 / 待审批用章":
    "Vencimiento de preservaciones / SMS judiciales no leídos / Sellos pendientes",
  保全: "Preservación",
  短信: "SMS",
  审批: "Aprobación",
  保存成功: "Guardado exitosamente",
  删除成功: "Eliminado exitosamente",
  操作失败: "Operación fallida",

  // Aprobación y sellos
  待审批用章: "Sellos pendientes de aprobación",
  用章申请: "Solicitud de sello",
  用章审批: "Aprobación de sello",
  印章: "Sello",
  电子印章: "Sello electrónico",
  用章记录: "Registro de sellos",
  申请用章: "Solicitar sello",
  待审批: "Pendiente de aprobación",
  已审批: "Aprobado",
  已驳回: "Rechazado",
  已撤回: "Retirado",
  通过: "Aprobar",
  驳回: "Rechazar",
  撤回: "Retirar",

  // Causas
  案由: "Causa",
  案由库: "Catálogo de causas",
  案由选择: "Seleccionar causa",
  案由代码: "Código de causa",
  民商事: "Civil/Comercial",
  刑事: "Penal",
  行政: "Administrativo",

  // Finanzas
  财务: "Finanzas",
  发票: "Factura",
  费用: "Gastos",
  收入: "Ingresos",
  支出: "Egresos",
  金额: "Monto",
  总金额: "Monto total",

  // Plazos y tareas
  期限: "Plazo",
  到期日: "Fecha de vencimiento",
  提醒: "Recordatorio",
  任务: "Tarea",
  待办: "Pendiente",
  已完成: "Completado",

  // Sidebar
  工作台: "Panel de trabajo",
  仪表盘: "Panel de control",
  概览: "Vista general",
  案件管理: "Gestión de casos",
  团队协作: "Trabajo en equipo",
  文件管理: "Gestión de documentos",

  // Anuncios
  公告: "Anuncio",
  发布公告: "Publicar anuncio",
  编辑公告: "Editar anuncio",
  发布: "Publicar",

  // Archivo
  结案: "Cerrar caso",
  暂停案件: "Suspender caso",
  结案小结: "Resumen de cierre",
  暂停原因: "Motivo de suspensión",
  确认结案: "Confirmar cierre",
  确认暂停: "Confirmar suspensión",

  // Clientes
  主要联系人: "Contacto principal",
  个人信息: "Información personal",
  工商信息: "Información comercial",
  历史客户: "Cliente histórico",

  // Documentos
  未知类型: "Tipo desconocido",
  律所文书: "Documentos del estudio",
  没有匹配: "Sin coincidencias",
  匹配: "Coincidencia",
  资料: "Material",

  // Inbox
  失败: "Error",
  已提取: "Ya descargado",
  附件: "Adjunto",
  链接: "Enlace",

  // Intakes
  发起人: "Iniciado por",
  不接案: "No aceptar caso",
  待补正: "Pendiente de corrección",
  终态: "Estado final",
  原因: "Motivo",
  已撤回: "Retirado",
  标记不接案: "Marcar como no aceptado",
  标记待补正: "Marcar como pendiente de corrección",

  // Matters
  未填写案由: "Causa sin completar",
  最近期限: "Plazo más próximo",
  未填写立案日期: "Fecha de inicio sin completar",
  暂无开庭安排: "Sin audiencia programada",
  未设目标: "Sin objetivo establecido",
  重要事项: "Elementos importantes",
  标记未完成: "Marcar como incompleto",
  标记完成: "Marcar como completado",
  未召开: "No realizada",
  已召开: "Realizada",
  寄出: "Enviado",
  收件: "Recibido",
  待识别: "Pendiente de identificación",
  待跟踪: "Pendiente de seguimiento",
  恢复环节: "Restaurar etapa",
  环节已隐藏: "Etapa oculta",
  环节已移除: "Etapa eliminada",
  移除失败: "Error al eliminar",
  紧急: "Urgente",
  高优先级: "Alta prioridad",
  逾期: "Vencido",
  今日到期: "Vence hoy",

  // Plazos
  期限: "Plazo",
  剩: "Restan",
  天: "días",

  // SMS
  收起原文: "Ocultar texto original",
  查看原文: "Ver texto original",
  回填失败: "Error al completar",
  未知: "Desconocido",

  // Usuarios
  姓名: "Nombre y apellido",
  初始密码: "Contraseña inicial",
  禁用: "Deshabilitar",
  重新激活: "Reactivar",
  已激活: "Activado",
  已禁用: "Deshabilitado",
  禁用后该用户无法登录: "El usuario no podrá iniciar sesión",
  重置: "Restablecer",
  角色: "Rol",

  // Cálculos
  财产分割金额: "Monto de división de bienes",
  诉讼标的金额: "Monto del objeto del litigio",
  元: "pesos",
  目标日: "Fecha objetivo",
  节点: "Etapa",

  // General
  与: "y",
  及: "y",
  等: "etc.",
  项: "ítems",
};

// Función mejorada que detecta caracteres chinos
function translateFile(filePath) {
  try {
    // Leer el archivo como buffer y convertirlo a string
    const buffer = fs.readFileSync(filePath);
    let content = buffer.toString("utf8");
    let modified = false;

    // Recorrer todas las traducciones
    for (const [chinese, spanish] of Object.entries(translations)) {
      // Buscar el texto chino en el contenido (como string)
      if (content.includes(chinese)) {
        // Reemplazar todas las ocurrencias
        content = content.split(chinese).join(spanish);
        modified = true;
      }
    }

    if (modified) {
      // Guardar el archivo con UTF-8 sin BOM
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`✅ Traducido: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error en ${filePath}:`, error.message);
    return false;
  }
}

function getAllFiles(dir) {
  const results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      const exclude = [
        "node_modules",
        ".next",
        "dist",
        ".git",
        "prisma",
        "scripts",
      ];
      if (!exclude.includes(item.name)) {
        results.push(...getAllFiles(fullPath));
      }
    } else if (item.name.endsWith(".tsx") || item.name.endsWith(".ts")) {
      results.push(fullPath);
    }
  }

  return results;
}

function main() {
  console.log("🔄 Iniciando traducción masiva...\n");
  const files = getAllFiles("./src");
  console.log(`📁 Encontrados ${files.length} archivos\n`);

  let count = 0;
  for (const file of files) {
    if (translateFile(file)) count++;
  }

  console.log(`\n✅ ${count} archivos traducidos.`);
}

main();
