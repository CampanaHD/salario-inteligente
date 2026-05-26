const loginForm =
  document.getElementById('loginForm');

const registerForm =
  document.getElementById('registerForm');

/* =========================================
   LOGIN
========================================= */

if(loginForm){

  loginForm.addEventListener('submit', async (e)=>{

    e.preventDefault();

    const email =
      document.getElementById('email').value;

    const senha =
      document.getElementById('senha').value;

    const btn =
      loginForm.querySelector('button');

    btn.innerText = 'Entrando...';
    btn.disabled = true;

    const { data, error } =
      await supabaseClient.auth.signInWithPassword({

        email,
        password: senha

      });

    if(error){

      mostrarToast(error.message);

      btn.innerText = 'Entrar';
      btn.disabled = false;

      return;

    }

    localStorage.setItem(
      'usuarioLogado',
      JSON.stringify(data.user)
    );

    mostrarToast('Login realizado');

    setTimeout(()=>{

      window.location.href = 'dashboard.html';

    },1000);

  });

}

/* =========================================
   CADASTRO
========================================= */

if(registerForm){

  registerForm.addEventListener('submit', async (e)=>{

    e.preventDefault();

    const email =
      document.getElementById('registerEmail').value;

    const senha =
      document.getElementById('registerSenha').value;

    const btn =
      registerForm.querySelector('button');

    btn.innerText = 'Criando...';
    btn.disabled = true;

    const { data, error } =
      await supabaseClient.auth.signUp({

        email,
        password: senha

      });

    if(error){

      mostrarToast(error.message);

      btn.innerText = 'Criar Conta';
      btn.disabled = false;

      return;

    }

    mostrarToast(
      'Conta criada com sucesso'
    );

    registerForm.reset();

    btn.innerText = 'Criar Conta';
    btn.disabled = false;

  });

}

/* =========================================
   VERIFICAR LOGIN
========================================= */

async function verificarLogin(){

  const { data } =
    await supabaseClient.auth.getSession();

  const session = data.session;

  const paginaAtual =
    window.location.pathname
      .split('/')
      .pop();

  const paginasProtegidas = [

    'dashboard.html',
    'admin.html',
    'estoque.html',
    'produtos.html',
    'pedidos.html',
    'fornecedores.html'

  ];

  if(
    paginasProtegidas.includes(paginaAtual)
    &&
    !session
  ){

    window.location.href = 'login.html';

  }

}

/* =========================================
   LOGOUT
========================================= */

async function logout(){

  await supabaseClient.auth.signOut();

  localStorage.removeItem(
    'usuarioLogado'
  );

  mostrarToast('Logout realizado');

  setTimeout(()=>{

    window.location.href = 'login.html';

  },1000);

}

/* =========================================
   TOAST
========================================= */

function mostrarToast(texto){

  const toast =
    document.createElement('div');

  toast.innerText = texto;

  toast.style.position = 'fixed';
  toast.style.bottom = '30px';
  toast.style.right = '30px';
  toast.style.background = '#ff9800';
  toast.style.color = '#fff';
  toast.style.padding = '16px 22px';
  toast.style.borderRadius = '14px';
  toast.style.zIndex = '9999';
  toast.style.fontWeight = '600';
  toast.style.boxShadow =
    '0 10px 30px rgba(0,0,0,.3)';

  document.body.appendChild(toast);

  setTimeout(()=>{

    toast.remove();

  },2500);

}

/* =========================================
   INIT
========================================= */

verificarLogin();