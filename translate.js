const fs = require('fs');
const path = require('path');

const translations = {
  '登录': 'Iniciar sesión',
  '注册': 'Registrarse',
  '用户名': 'Usuario',
  '密码': 'Contraseña',
  '邮箱': 'Email',
  '案件': 'Caso',
  '律师': 'Abogado',
  '客户': 'Cliente',
  '设置': 'Configuración',
  '退出': 'Cerrar sesión',
  '管理': 'Administrar',
  '系统': 'Sistema',
  '通知': 'Notificaciones',
  '报告': 'Informe',
  '搜索': 'Buscar',
  '添加': 'Agregar',
  '编辑': 'Editar',
  '删除': 'Eliminar',
  '保存': 'Guardar',
  '取消': 'Cancelar',
  '确定': 'Aceptar',
  '关闭': 'Cerrar',
  '返回': 'Volver',
  '下一步': 'Siguiente',
  '上一步': 'Anterior',
  '提交': 'Enviar',
  '重新加载': 'Recargar',
  '加载': 'Cargar',
  '创建': 'Crear',
  '更新': 'Actualizar',
  '请填写有效邮箱': 'Ingresá un email válido',
  '请填写密码': 'Ingresá tu contraseña',
  '邮箱或密码错误': 'Email o contraseña incorrectos',
  '隐藏密码': 'Ocultar contraseña',
  '显示密码': 'Mostrar contraseña',
  '登录中...': 'Iniciando sesión...',
  '忘记密码？联系系统管理员重置': '¿Olvidaste tu contraseña? Contactá al administrador',
  '欢迎回来': 'Bienvenido',
  '用您的工作邮箱登录': 'Ingresá con tu email de trabajo',
  '待我处理': 'Pendientes',
  '全部': 'Ver todos',
  '暂无待处理事项': 'No hay pendientes',
  '保全到期 / 未读法院短信 / 待审批用章': 'Vencimiento de preservaciones / SMS judiciales no leídos / Sellos pendientes',
  '保全': 'Preservación',
  '短信': 'SMS',
  '审批': 'Aprobación',
  '保存成功': 'Guardado exitosamente',
  '删除成功': 'Eliminado exitosamente',
  '操作失败': 'Operación fallida',
  '民商事': 'Civil/Comercial',
  '刑事': 'Penal',
  '行政': 'Administrativo',
  '名称': 'Nombre',
  '编码': 'Código',
  '状态': 'Estado',
  '日期': 'Fecha',
  '描述': 'Descripción',
  '备注': 'Observaciones',
  '操作': 'Acciones',
  '查看': 'Ver',
  '编辑': 'Editar',
  '今天': 'Hoy',
  '明天': 'Mañana',
  '昨天': 'Ayer',
  '一月': 'Enero',
  '二月': 'Febrero',
  '三月': 'Marzo',
  '四月': 'Abril',
  '五月': 'Mayo',
  '六月': 'Junio',
  '七月': 'Julio',
  '八月': 'Agosto',
  '九月': 'Septiembre',
  '十月': 'Octubre',
  '十一月': 'Noviembre',
  '十二月': 'Diciembre',
  '总': 'Total',
  '案件管理': 'Gestión de Casos',
  '团队协作': 'Trabajo en Equipo',
  '文件管理': 'Gestión de Documentos',
  '财务': 'Finanzas',
  '日程': 'Calendario',
  '提醒': 'Recordatorios'
};

function translateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const [chinese, spanish] of Object.entries(translations)) {
      if (content.includes(chinese)) {
        content = content.replaceAll(chinese, spanish);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
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
      const exclude = ['node_modules', '.next', 'dist', '.git', 'prisma', 'scripts'];
      if (!exclude.includes(item.name)) {
        results.push(...getAllFiles(fullPath));
      }
    } else if (item.name.endsWith('.tsx') || item.name.endsWith('.ts')) {
      results.push(fullPath);
    }
  }

  return results;
}

function main() {
  console.log('🔄 Iniciando traducción masiva...\n');
  const files = getAllFiles('./src');
  console.log(`📁 Encontrados ${files.length} archivos\n`);

  let count = 0;
  for (const file of files) {
    if (translateFile(file)) count++;
  }

  console.log(`\n✅ ${count} archivos traducidos.`);
}

main();