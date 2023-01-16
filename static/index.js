"use strict"

//stringa con mail dell'utente corrente
let mail_current_user = "";

$(document).ready(function () {
	//sezione del login
	const _username = $("#txtEmail");
	const _password = $("#txtPassword");
	const _eyePwd = $("#eyePwd");
	const _btnLogin = $("#btnLogin");

	//parti del progetto
	const div_login = $("#div_login");
	const _wrapper = $("#wrapper");
	const div_user = $("#div_user");

	//sezione utente
	const _btnAddUser = $("#btnAddUser");
	const _modalUser = $("#modalUser");

	//input per aggiunta utenti
	const txtEmailNew = $("#txtEmailNew");
	const txtPwdNew = $("#txtPwdNew");
	const txtRuoloNew = $("#txtRoleNew");

	//modale aggiunta utente
	const btnSaveUser = $("#btnSaveUser");
	const _newUserMailErr = $("#newUserMailErr");
	const _newUserError = $("#newUserError");

	//sezioni navbar
	const btnUtenti = $("#btnUtenti");

	//tag <p> con errori
	const _mailErr = $("#mailErr");
	const _accesErr = $("#accesErr");

	//inizializzare componenti bootstrap
	var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
	var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
		return new bootstrap.Tooltip(tooltipTriggerEl)
	})

	
	//nascondo wrapper
	_wrapper.hide();
	div_login.show();
	


	_eyePwd.on("click", function () {
		if (_eyePwd.hasClass("bi bi-eye")) {
			_eyePwd.removeClass("bi bi-eye");
			_eyePwd.addClass("bi bi-eye-slash");
			_password.prop("type", "text");
		}
		else {
			_eyePwd.removeClass("bi bi-eye-slash");
			_eyePwd.addClass("bi bi-eye");
			_password.prop("type", "password");
		}
	})

	//controlla quando l'input mail perde il focus
	_username.on("blur", function () {
		if (_username.val() != "") {//controllo che non sia vuoto, perchè non voglio che mi dia errore se non ho ancora scritto nulla
			let regMail = new RegExp("^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,6}$");//regex per la mail
			if (!regMail.test(_username.val())) {
				_username.addClass("input-error");
				_mailErr.text("il campo deve contenere una mail valida")
			}
			else {
				_username.removeClass("input-error");
				_mailErr.text("");
			}
		}
		else {
			_username.removeClass("input-error");
			_mailErr.text("");
		}
	});

	_btnLogin.on("click", function () {
		controllaLogin();
	});

	$(document).on('keydown', function (event) {
		if (event.keyCode == 13)
			controllaLogin();
	});

	_btnAddUser.on("click", function () {
		_modalUser.show();
		//svuoto i campi
		txtEmailNew.val("");
		txtPwdNew.val("");
		txtRuoloNew.prop("selectedIndex", 0);

	});

	btnUtenti.on("click", () => {
		inserisciUtenti()
	});

	txtEmailNew.on("blur", function () {
		if (txtEmailNew.val() != "") {//controllo che non sia vuoto, perchè non voglio che mi dia errore se non ho ancora scritto nulla
			let regMail = new RegExp("^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,6}$");//regex per la mail
			if (!regMail.test(txtEmailNew.val())) {
				txtEmailNew.addClass("input-error");
				_newUserMailErr.text("il campo deve contenere una mail valida")
			}
			else {
				txtEmailNew.removeClass("input-error");
				_newUserMailErr.text("");
			}
		}
		else {
			txtEmailNew.removeClass("input-error");
			_newUserMailErr.text("");
		}
	});

	btnSaveUser.on("click", function () {
		//controllo campi che siano compilati
		if (txtEmailNew.val() == "") {
			_newUserMailErr.text("Inserire una mail");
			return;
		}
		//se la password è vuota, il valore default è "password"
		let param = {}
		param.mail = txtEmailNew.val();
		param.password = txtPwdNew.val() == "" ? "password" : txtPwdNew.val();
		param.admin = txtRuoloNew.val() == 1 ? true : false;
		let requestnewUser = inviaRichiesta("POST", "/api/newUser", param);
		requestnewUser.fail((jqXHR, testStatus, strError) => {
			if (jqXHR.status == 401) //401 => utente non autorizzato
				_newUserMailErr.text("mail già presente");
			else
				errore(jqXHR, testStatus, strError)
		});
		requestnewUser.done((data) => {
			alert("utente aggiunto");
			$("#btnCloseModal").trigger("click");
			inserisciUtenti();
		})

	});


	function controllaLogin() {
		if (_username.val() == "" || _password.val() == "") {
			_accesErr.text("inserire username e password");
		}
		else {
			_accesErr.text("");
			let request = inviaRichiesta("POST", "/api/login", { "username": _username.val(), "password": _password.val() });
			request.fail((jqXHR, testStatus, strError) => {
				if (jqXHR.status == 401) //401 => utente non autorizzato
					_accesErr.text("username o password errati");
				else
					errore(jqXHR, testStatus, strError)
			});
			request.done((data) => {
				mail_current_user = data.mail;
				div_login.hide();
				_wrapper.show();
			});
		}
	}

	function inserisciUtenti() {
		let requestUtenti = inviaRichiesta("POST", "/api/showUtenti")
		requestUtenti.fail(errore)
		requestUtenti.done((data) => {
			console.log(data)
			
			//rimuovo righe con classe usershow
			$(".usershow").remove();
			//creazione riga
			for (const user of data) {
				let html = ""
				let div = $("<div>").addClass("row usershow").insertBefore(_btnAddUser.parent().parent());
				let col = $("<div>").addClass("col-md-12").appendTo(div)
				if (user.admin == true) {
					//aggiunge il badge che indica che è un admin
					html += "<span class='badge bg-primary amministratore'>admin"
					html += "<i class='bi bi-shield-lock-fill'></i>"
					html += "</span>"
				}

				if (user.mail == mail_current_user)
					col.html(user.mail + " (tu)" + html)
				else
					col.html(user.mail + html)

			}
		})
	}









});