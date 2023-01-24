"use strict"

//stringa con mail dell'utente corrente
let mail_current_user = "";
const map_icon = "M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"
let total_markers = [];
let total_infowindows = [];
const markerColor = "FF3333";
let lastWindow = null;
let index; //per la lista utenti
let mapID; //per la mappa
let directionsRenderer; //per disegnare la rotta
let _result; //per salvare la posizione della sede principale

let MAP_KEY;
let infoWindow;

//funzione che viene eseguita quando la pagina carica
window.onload = function () {

	//#region variabili
	//parti del progetto
	const _wrapper = $("#wrapper");
	const div_user = $("#div_user");
	const div_filtro = $("#div_filtro");
	const divMappa = $("#divMappa");
	const divPerizie = $("#divPerizie");
	_wrapper.hide();
	let request = inviaRichiesta("POST", "/api/getUser");
	request.fail(errore);
	request.done(function (data) {
		mail_current_user = data.mail;
		_wrapper.show();
	});

	caricaGoogleMaps();
}
function documentReady() {
	//sezione utente
	const _btnAddUser = $("#btnAddUser");
	const _modalUser = $("#modalUser");
	const _userDettagli = $("#userDettagli");
	const _btnLogout = $("#btnLogout");



	//input per aggiunta utenti
	const txtEmailNew = $("#txtEmailNew");
	const txtPwdNew = $("#txtPwdNew");
	const txtRuoloNew = $("#txtRoleNew");

	//modale aggiunta utente
	const btnSaveUser = $("#btnSaveUser");
	const _newUserMailErr = $("#newUserMailErr");

	//modale dettagli utente
	const _imgProfilo = $("#imgProfilo");
	const _nomeUtente = $("#nomeUtente");
	const _txtEmailDettagli = $("#txtEmailDettagli")
	const _txtColorDettagli = $("#txtColorDettagli");
	const _btnSalvaDettagli = $("#btnSalvaDettagli");

	//divMappa
	const _map = $("#map").get(0);
	const _link = $(".link");
	const _btnImportant = $("#btnImportant");
	const _btnCloseDirections = $("#btnCloseDir");

	//divInfo
	const div_info = $("#div_info");
	const user_perizia = $("#user_perizia");
	const txtInfoUser = $("#txtInfoUser");
	const txtInfoPerizia = $("#txtInfoPerizia");
	const _btnClose = $("#btnClose");
	const _desc_img = $("#desc_img");
	const _btnInfoModifica = $("#btnInfoModifica");
	const _btnInfoSalva = $("#btnInfoSalva");
	const _btnInfoAnnulla = $("#btnInfoAnnulla");

	//divFiltro
	const _listUtenti = $("#listUtenti");
	const _listPerizie = $("#listPerizie");

	//sezioni navbar
	const btnUtenti = $("#btnUtenti");

	//#endregion

	//#region inizializzazione

	div_info.hide();

	//inizializzo tooltip bootstrap
	var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
	var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
		return new bootstrap.Tooltip(tooltipTriggerEl)
	})
	//#endregion

	_btnLogout.on("click", function () {
		localStorage.removeItem("token")
		window.location.href = "login.html"
	});

	//#region google maps

	//mostro la mappa di Google Maps

	let geocoder = new google.maps.Geocoder();
	geocoder.geocode({
		"address": "Fossano Via San Michele 68" //prendo latitudine e longitudine
	}, (result, status) => {
		if (status == google.maps.GeocoderStatus.OK) {
			let mapOptions = {
				"center": result[0].geometry.location,
				"zoom": 12,
				"mapTypeId": google.maps.MapTypeId.ROADMAP
			};
			mapID = new google.maps.Map(_map, mapOptions);
			let position = new google.maps.LatLng(result[0].geometry.location)
			_result = result;
			//change the marker color
			const svgMarker = {
				path: map_icon,
				fillColor: "#FF0000",
				fillOpacity: 1,
				strokeWeight: 2,
				strokeColor: "#00000",
				rotation: 0,
				scale: 1.8,
				anchor: new google.maps.Point(0, 20),
			};
			let marker = new google.maps.Marker({
				icon: svgMarker,
				map: mapID,
				position: position
			});
			total_markers.push(marker);

			let infoWindowOption = {
				"content": `<b class='title'>Sede principale<b>
							<hr>
							<p class='content'>Via San Michele 68, Fossano</p>`,
				"width": 150
			}
			infoWindow = new google.maps.InfoWindow(infoWindowOption);
			total_infowindows.push(infoWindow);
			marker.addListener("click", function () {
				if (infoWindow)
					infoWindow.close();
				infoWindow.open(mapID, marker);
			})

			let requestMarker = inviaRichiesta("POST", "/api/showUtenti");
			requestMarker.fail(errore);
			requestMarker.done((data) => {


				creaMarkers(data, mapID, result)

				let bounds = new google.maps.LatLngBounds();
				for (var i = 0; i < total_markers.length; i++) {
					bounds.extend(total_markers[i].position);
				}
				mapID.fitBounds(bounds);
				if (mapID.getZoom() > 15) {
					mapID.setZoom(15);
				}


			});
		}
	})

	//#endregion

	//#region eventi carousel
	$(".carousel-control-prev").on("click", function () {
		let perizia = $(this).parent().prop("perizie")
		let max_length = perizia.immagini.length;
		if (index <= 0) {
			index = max_length;
		}
		index--;
		$("#img").children("img").remove();
		let img_carousel = $("<img>").attr("src", perizia.immagini[index].img_url).css("width", "100%")
		_desc_img.children("span").text(perizia.img_desc[index]);
		img_carousel.appendTo($("#img"))
		$("#img").children("img").css("animation", "fadeIn 1s")
		setTimeout(function () {
			$("#img").children("img").css("animation", "none")
		}, 1000)
	})
	$(".carousel-control-next").on("click", function () {
		let perizia = $(this).parent().prop("perizie")
		let max_length = perizia.immagini.length;
		if (index == max_length - 1) {
			index = -1;
		}
		index++;
		$("#img").children("img").remove();
		let img_carousel = $("<img>").attr("src", perizia.immagini[index].img_url).css("width", "100%")
		_desc_img.children("span").text(perizia.img_desc[index])
		img_carousel.appendTo($("#img"))
		$("#img").children("img").css("animation", "fadeIn 1s")
		setTimeout(function () {
			$("#img").children("img").css("animation", "none")
		}, 1000)
	})
	//#endregion

	//#region eventi informazioni perizia

	_btnInfoModifica.on("click", function () {
		_btnInfoAnnulla.show();
		_btnInfoModifica.hide();
		_btnInfoSalva.show();

		_desc_img.children("span").hide()
		let perizia = _btnImportant.prop("perizia");
		//rendo tutti i campi della perizia modificabili
		txtInfoPerizia.find("input").prop("readonly", false);
		txtInfoPerizia.find("input").addClass("enableInput").removeClass("disableInput")
		txtInfoPerizia.find("textarea").prop("readonly", false);
		txtInfoPerizia.find("textarea").addClass("enableInput").removeClass("disableInput")

		for (let i = 0; i < perizia.img_desc.length; i++) {
			//creo textarea per ogni descrizione
			let txtArea = $("<textarea>").addClass("form-control").val(perizia.img_desc[i]).css("margin-top", "10px")
			txtArea.appendTo($("#desc_img"))
		}
		_desc_img.css({ "height": "50% ", "overflow": "auto" })
		$("#img").css("height", "50%")
	})
	_btnInfoAnnulla.on("click", function () {
		disableInput();
		let perizia = _btnImportant.prop("perizia");
		//ripristino i valori precedenti
		_desc_img.find("textarea").remove();
		_desc_img.css({ "height": "10% ", "overflow": "" })
		$("#img").css("height", "90%")

		txtInfoPerizia.find("input").eq(0).val(perizia.nome);
		txtInfoPerizia.find("input").eq(1).val(perizia.data.split("T")[0]);
		txtInfoPerizia.find("input").eq(2).val(perizia.data.split("T")[1]);
		txtInfoPerizia.find("textarea").eq(0).val(perizia.descrizione);

	})
	_btnInfoSalva.on("click", function () {
		let perizia = _btnImportant.prop("perizia");
		let item = _btnImportant.prop("user");
		let desc = [];
		for (let i = 0; i < _desc_img.find("textarea").length; i++) {
			desc.push(_desc_img.find("textarea").eq(i).val())
		}
		let record = {
			"id_perizia": _btnImportant.prop("id_perizia"),
			"mail": _btnImportant.prop("mail"),
			"nome": txtInfoPerizia.find("input").eq(0).val(),
			"data": txtInfoPerizia.find("input").eq(1).val() + "T" + txtInfoPerizia.find("input").eq(2).val(),
			"descrizione": txtInfoPerizia.find("textarea").eq(0).val(),
			"img_desc": desc
		}
		let requestModifica = inviaRichiesta("PATCH", "/api/modificaPerizia", record);
		requestModifica.fail(errore);
		requestModifica.done(function (data) {
			_desc_img.find("textarea").remove();
			_desc_img.css({ "height": "10% ", "overflow": "" })
			$("#img").css("height", "90%")
			disableInput()
			let id_infowindow = parseInt(_btnImportant.prop("id_marker").split("_")[1])
			//modifico l'infowindow
			total_infowindows[id_infowindow].setContent(`<b class='title'>${perizia.nome}</b>
			<hr>
			<div class='info_marker'>
			<p class='content'><b>Perizia effettuata il:</b> ${txtInfoPerizia.find("input").eq(1).val()}</p>
			<p class='content'><b>Perizia fatta da:</b> ${!item.username ? item.mail : item.username}</p>
			<p class='content'><b>Foto allegate: </b>${!perizia.immagini ? 0 : perizia.immagini.length}</p>
			<p class='content'><b>Anteprima immagine:</b></p>
			<div class='img_container'>
				<img src='${!perizia.immagini ? '' : perizia.immagini[0].img_url}' alt='immagine anteprima' class='img_preview'>
			</div>
			<hr>
			<a class='percorso'>Visualizza percorso</a>
			<p class='link' id_perizia = '${perizia.id_perizia}' mail = '${item.mail}' id='marker_${id_infowindow}'><a href='#div_info'>Vai alla perizia</a></p>
			</div>
			`);
			let requestInfo = inviaRichiesta("POST", "/api/getPerizia", { "id_perizia": perizia.id_perizia, "mail": item.mail });
			requestInfo.fail(errore);
			requestInfo.done(function (data) {
				mostraDati(data);
			})




		});
	})
	//#endregion

	function disableInput() {
		_btnInfoAnnulla.hide();
		_btnInfoModifica.show();
		_btnInfoSalva.hide();
		//rendo tutti i campi della perizia non modificabili
		_desc_img.children("span").show();
		_desc_img.removeClass("enableInput");
		txtInfoPerizia.find("input").prop("readonly", true);
		txtInfoPerizia.find("input").removeClass("enableInput").addClass("disableInput")
		txtInfoPerizia.find("textarea").prop("readonly", true);
		txtInfoPerizia.find("textarea").removeClass("enableInput").addClass("disableInput")
	}


	_btnImportant.on("click", function () {
		let value;
		if (_btnImportant.hasClass("bi-star-fill")) {
			_btnImportant.removeClass("bi bi-star-fill").addClass("bi bi-star");
			_btnImportant.css("color", "black")
			_btnImportant.attr({ "data-bs-original-title": "Segna come importante", "aria-label": "Segna come importante" })
			value = false;
		} else {
			_btnImportant.removeClass("bi bi-star").addClass("bi bi-star-fill");
			_btnImportant.css("color", "gold")
			_btnImportant.attr({ "data-bs-original-title": "Rimuovi come importante", "aria-label": "Rimuovi come importante" })
			value = true;
		}
		let id_perizia = $(this).prop("id_perizia")
		let mail = $(this).prop("mail")
		let id_marker = $(this).prop("id_marker");

		let requestImportant = inviaRichiesta("POST", "/api/important", { value, id_perizia, mail });
		requestImportant.fail(errore);
		requestImportant.done((data) => {
			//modifico il marker dando il colore del bordo giallo

			let marker = total_markers[parseInt((id_marker).split("_")[1])]

			let color;
			if (value) {
				color = "#FFD700";
			}
			else {
				color = "#000000";
			}
			const svgMarker = {
				path: map_icon,
				fillColor: $(this).prop("full_color"),
				fillOpacity: 1,
				strokeWeight: 2,
				strokeColor: color,
				rotation: 0,
				scale: 1.8,
				anchor: new google.maps.Point(0, 20),
			};

			//cambio colore del bordo del marker
			marker.setIcon(svgMarker);





		});
	});

	_btnClose.on("click", function () {
		div_info.hide();
	});

	_btnCloseDirections.on("click", function () {
		$("#panel").css("z-index", "-1");
		$("#panel").children("div").html("");
		if (directionsRenderer)
			directionsRenderer.setMap(null);
		let bounds = new google.maps.LatLngBounds();
		for (var i = 0; i < total_markers.length; i++) {
			bounds.extend(total_markers[i].position);
		}
		mapID.fitBounds(bounds);
		if (mapID.getZoom() > 15) {
			mapID.setZoom(15);
		}
	});

	_btnAddUser.on("click", function () {
		_modalUser.show();
		//svuoto i campi
		txtEmailNew.val("");
		txtPwdNew.val("");
		$("#txtUsernameNew").val("");

	});

	btnUtenti.on("click", () => {
		inserisciUtenti()
	});

	_listPerizie.on("change", function () {
		eseguiFiltro();

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
		let formData = new FormData();
		formData.append("mail", txtEmailNew.val());
		formData.append("password", txtPwdNew.val() == "" ? "password" : txtPwdNew.val());
		if ($("#txtImgNew").prop("files")[0])
			formData.append("img", $("#txtImgNew").prop("files")[0]);
		if ($("#txtUsernameNew").val() != "")
			formData.append("username", $("#txtUsernameNew").val());
		if (txtPwdNew.val() == "")
			formData.append("change", true);
		else
			formData.append("change", false);
		formData.append("admin", false);
		formData.append("color", "#FF0000");
		let requestnewUser = inviaRichiestaMultipart("POST", "/api/newUser", formData);
		requestnewUser.fail((jqXHR, testStatus, strError) => {
			if (jqXHR.status == 401) //401 => utente non autorizzato
				_newUserMailErr.text("mail già presente");
			else
				errore(jqXHR, testStatus, strError)
		});
		requestnewUser.done((data) => {

			inserisciUtenti();
			$("#btnCloseModal").trigger("click");
		})

	});

	//#region filtro perizie

	$(document).on('keydown', function (event) {
		if (event.keyCode == 13)
			eseguiFiltro();
	});


	function eseguiFiltro() {
		let mail = _listUtenti.val(); //mail dell'utente selezionato
		let value = parseInt(_listPerizie.val()); //valore della perizia selezionata

		let requestFilter = inviaRichiesta("POST", "/api/filter", { "mail": mail, "value": value });
		requestFilter.fail(errore);
		requestFilter.done((data) => {
			div_info.hide();
			for (let i = 1; i < total_markers.length; i++) {
				total_markers[i].setMap(null);
			}
			//cancello i valori nel vettori dei markers tranenn il primo
			total_markers.splice(1, total_markers.length - 1);
			total_infowindows.splice(1, total_infowindows.length - 1);
			creaMarkers(data, mapID, _result);
		});
	}

	//#endregion

	function inserisciUtenti() {
		let requestUtenti = inviaRichiesta("POST", "/api/showUtenti")
		requestUtenti.fail(errore)
		requestUtenti.done((data) => {

			//rimuovo righe con classe usershow
			$(".usershow").parent().remove();
			//creazione riga
			for (const user of data) {
				let btn;
				let text = "";
				let div = $("<div>").addClass("row").insertBefore(_btnAddUser.parent().parent());
				let col = $("<div>").addClass("col-md-12 usershow").appendTo(div);
				let divOptions = $("<div>").addClass("col-md-7 text-truncate").appendTo(col);
				text = user.username ? user.username : user.mail;//se username è null, allora metto la mail
				if (user.mail == mail_current_user)
					divOptions.html(text + " (tu)");
				else
					divOptions.html(text);

				divOptions = $("<div>").addClass("col-md-5 options").appendTo(col).prop("utente", user)
				if (user.admin == true) {//aggiunge il badge che indica che è un admin
					let span = $("<span>").addClass("badge bg-primary amministratore").text("admin").appendTo(divOptions);
					$("<i>").addClass("bi bi-shield-lock-fill").appendTo(span);
				}
				else {
					if (user.deleted)//aggiungo badge deleted, barro l'utente e aggiungo pulsante per togliere le perizie
					{
						let span = $("<span>").addClass("badge bg-danger amministratore").text("deleted").appendTo(divOptions);
						$("<i>").addClass("bi bi-x-circle-fill").appendTo(span);
						btn = $("<button>").prop("utente", user).addClass("detail").appendTo(divOptions).on("click", lastDelete)
						$("<i>").addClass("bi bi-x-square-fill dettagliUser").appendTo(btn);
						divOptions.parent().children("div").eq(0).css("text-decoration", "line-through");
					}
					else {
						btn = $("<button>").prop("utente", user).addClass("detail").appendTo(divOptions).on("click", deleteUser);
						$("<i>").addClass("bi bi-person-x-fill").appendTo(btn);
					}
				}
				if (!user.deleted) {
					//aggiunta icona per visualizzare i dati utente
					btn = $("<button>").attr({ "data-bs-toggle": "modal", "data-bs-target": "#userDettagli" }).addClass("detail").appendTo(divOptions);
					console.log(user)

					$("<i>").addClass("bi bi-person-circle dettagliUser").appendTo(btn)
					btn.on("click", visualizzaDettagli);
				}
			}
		})
	}

	$("#btnRigeneraPassword").on("click", function () {
		console.log(_txtEmailDettagli.val())
		let request = inviaRichiesta("POST", "/api/riGeneraPassword", { "mail": _txtEmailDettagli.val() });
		request.fail(errore);
		request.done((data) => {
			swal.fire({
				title: "Password generata",
				text: "La password è stata generata e inviata all'utente",
				icon: "success",
				confirmButtonText: "Ok"
			}).then((result) => {
				$("#btnChiudiDettagli").trigger("click");
			})
		})
	})

	_btnSalvaDettagli.on("click", function () {
		let param = {};
		param.mail = _txtEmailDettagli.val();
		param.color = _txtColorDettagli.val();
		let request = inviaRichiesta("POST", "/api/updateUser", param);
		request.fail(errore);
		request.done((data) => {
			$("#btnChiudiDettagli").trigger("click");
			inserisciUtenti();
			eseguiFiltro();
		})

	});

	function mostraDati(data) {
		console.log(data)
		let item = data[0];
		let perizia = item.perizie[0];
		div_info.find("p").remove();
		if (item.img && !item.deleted)
			user_perizia.attr("src", item.img)
		else
			user_perizia.attr("src", "img/user.jpg")

		if (perizia.important) {
			_btnImportant.addClass("bi-star-fill").removeClass("bi-star").css({ color: "gold" })
			_btnImportant.attr({ "data-bs-original-title": "Rimuovi come importante", "aria-label": "Rimuovi come importante" })
		}
		else {
			_btnImportant.removeClass("bi-star-fill").addClass("bi-star").css({ color: "black" })
			_btnImportant.attr({ "data-bs-original-title": "Segna come importante", "aria-label": "Segna come importante" })
		}


		if (item.username)
			$("<p>").appendTo(txtInfoUser).html("<b>Utente:</b> " + item.username);
		$("<p>").appendTo(txtInfoUser).html("<b>Mail:</b> " + item.mail);

		$("<p>").appendTo(txtInfoPerizia).html("<b>Nome perizia: </b><input type='text' class='disableInput' value='" + perizia.nome + "' readonly>").addClass("content")
		$("<p>").appendTo(txtInfoPerizia).html("Perizia effettuata il giorno <input type='text' class='disableInput' value='" + perizia.data.split("T")[0] + "' readonly>").addClass("content")
		$("<p>").appendTo(txtInfoPerizia).html("alle ore <input type='text' class='disableInput' value='" + perizia.data.split("T")[1] + "' readonly>").addClass("content")
		$("<p>").appendTo(txtInfoPerizia).html("<b style='position:absolute;'>Descrizione:</b> <textarea style='margin-top: 30px; width:100%;'class='disableInput' readonly>" + perizia.descrizione + "</textarea>").css({
			"font-size": "1.2em",
			"margin-top": "1em",
			"margin-bottom": "1em",
			"position": "relative"

		})
		index = 0;

		let max_length = 0;
		$("#img").prop("perizie", perizia);
		$("#img").children("img").remove();

		if (perizia.immagini) {
			max_length = perizia.immagini.length;

			let img_carousel = $("<img>").attr("src", perizia.immagini[index].img_url).css("width", "100%");
			img_carousel.appendTo($("#img"))
			_desc_img.children("span").text(perizia.img_desc[index])
		}
		else
			_desc_img.children("span").text("")



		if (max_length > 1) {
			$(".carousel-control-prev").show()
			$(".carousel-control-next").show();

		}
		else {
			$(".carousel-control-prev").hide()
			$(".carousel-control-next").hide();
		}
	}

	function lastDelete() {
		let utente = $(this).parent().prop("utente");
		//swal.fire con checkbox per confermare eliminazione
		swal.fire({
			title: 'Vuoi eliminare tutte le perizie dell\'utente?',
			text: "L'utente verrà cancellato definitivamente",
			icon: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#3085d6',
			cancelButtonColor: '#d33',
			confirmButtonText: 'Conferma',
			cancelButtonText: 'Annulla'
		}).then((result) => {
			if (result.isConfirmed) {
				let requestDelete = inviaRichiesta("POST", "/api/deleteUser", { "mail": utente.mail, "delete": 1 });
				requestDelete.fail(errore);
				requestDelete.done((data) => {
					swal.fire({
						title: 'Operazione eseguita con successo',
						icon: 'L\'utente è stato eliminato definitivamente',
						confirmButtonText: 'Ok'
					});
					inserisciUtenti();
				});
			}
		});
	}

	function visualizzaDettagli() {

		let utente = $(this).parent().prop("utente");
		if (utente.admin)
			$("#btnRigeneraPassword").hide();
		else
			$("#btnRigeneraPassword").show();
		if (utente.img)
			_imgProfilo.prop("src", utente.img);
		else
			_imgProfilo.prop("src", "img/user.jpg");
		if (utente.username)
			_nomeUtente.text(utente.username);
		else
			_nomeUtente.html("<i>Nessun username</i>");
		_txtEmailDettagli.val(utente.mail);
		if (utente.color)
			_txtColorDettagli.val(utente.color);
		else
			_txtColorDettagli.val("#FF0000");

	}

	function deleteUser() {
		let utente = $(this).parent().prop("utente");
		//swal.fire con checkbox per confermare eliminazione
		swal.fire({
			title: 'Sei sicuro di voler eliminare l\'utente?',
			text: "Non potrai annullare l'operazione!",
			icon: 'warning',
			input: 'checkbox',
			inputPlaceholder: 'Rimuovi anche le perizie dell\'utente',
			showCancelButton: true,
			confirmButtonColor: '#3085d6',
			cancelButtonColor: '#d33',
			confirmButtonText: 'Conferma',
			cancelButtonText: 'Annulla'
		}).then((result) => {
			if (result.isConfirmed) {

				//see the value of the checkbox
				let checkbox = result.value;

				let requestDelete = inviaRichiesta("POST", "/api/deleteUser", { "mail": utente.mail, "delete": checkbox });
				requestDelete.fail(errore);
				requestDelete.done((data) => {
					//sweetallert con messaggio di conferma
					swal.fire({
						title: 'Operazione eseguita con successo',
						icon: 'success',
						confirmButtonText: 'Ok'
					});
					inserisciUtenti();
				});
			}
		});

	}




	function creaMarkers(data, mapID, result) {
		let cont = 0;
		for (const item of data) {
			let perizie = item.perizie;
			if (perizie) {

				for (const perizia of perizie) {
					cont++;
					let position = new google.maps.LatLng(perizia.coord.lat, perizia.coord.lon)
					const svgMarker = {
						path: map_icon,
						fillColor: item.color,
						fillOpacity: 1,
						strokeWeight: 2,
						strokeColor: !perizia.important ? "#000000" : "#FFD700",
						rotation: 0,
						scale: 1.8,
						anchor: new google.maps.Point(0, 20),
					};
					let marker = new google.maps.Marker({
						icon: svgMarker,
						map: mapID,
						position: position
					});

					total_markers.push(marker);

					let infoWindowOption = {
						"content": `<b class='title'>${perizia.nome}</b>
											<hr>
											<div class='info_marker'>
											<p class='content'><b>Perizia effettuata il:</b> ${perizia.data.split("T")[0]}</p>
											<p class='content'><b>Perizia fatta da:</b> ${!item.username ? item.mail : item.username}</p>
											<p class='content'><b>Foto allegate: </b>${!perizia.immagini ? 0 : perizia.immagini.length}</p>
											<p class='content'><b>Anteprima immagine:</b></p>
											<div class='img_container'>
												<img src='${!perizia.immagini ? '' : perizia.immagini[0].img_url}' alt='immagine anteprima' class='img_preview'>
											</div>
											<hr>
											<a class='percorso'>Visualizza percorso</a>
											<p class='link' id_perizia = '${perizia.id_perizia}' mail = '${item.mail}' id='marker_${cont}'><a href='#div_info'>Vai alla perizia</a></p>
											</div>
											`,
						"width": 150
					}



					let infoWindow = new google.maps.InfoWindow(infoWindowOption);
					total_infowindows.push(infoWindow);
					marker.addListener("click", function () {
						$(".btn-close").trigger("click");
						if (lastWindow)
							lastWindow.close();
						lastWindow = infoWindow;
						infoWindow.open(mapID, this);
						google.maps.event.addListener(infoWindow, "domready", function () {
							let link = $(".link");
							link.on("click", function () {


								let id_perizia = $(this).attr("id_perizia");
								let mail = $(this).attr("mail");
								let id_marker = $(this).attr("id");
								div_info.show();
								_btnImportant.prop({ id_perizia, mail, id_marker, "full_color": item.color, "perizia": perizia, "user": item });
								let requestInfo = inviaRichiesta("POST", "/api/getPerizia", { id_perizia, mail });
								requestInfo.fail(errore);
								requestInfo.done(function (data) {
									mostraDati(data);

								});
								//inserimeto dati sulla perizia





							});

							let percorso = $(".percorso");
							percorso.on("click", function () {
								_btnCloseDirections.trigger("click");
								$("#panel").css("z-index", "1");
								let start = result[0].geometry.location;
								let end = new google.maps.LatLng(perizia.coord.lat, perizia.coord.lon)

								let directionsService = new google.maps.DirectionsService();
								let routesOptions = {
									origin: start,
									destination: end,
									travelMode: google.maps.TravelMode.DRIVING, // default
									provideRouteAlternatives: false, // default=false
									avoidTolls: false, // default (pedaggi)
								};

								let rendererOptions = {
									polylineOptions: {
										strokeColor: item.color, // colore del percorso
										strokeWeight: 6, // spessore
										zIndex: 100, // posizionamento (quella con zIndex più alto verra visualizzata)

									},
									suppressMarkers: true, // non vogliamo i marker di default

								}
								directionsRenderer = new google.maps.DirectionsRenderer(rendererOptions);

								let promise = directionsService.route(routesOptions)
								promise.then(function (directionsRoutes) {
									let mapOptions = {};

									if (directionsRoutes.status == google.maps.DirectionsStatus.OK) {

										//se è andato tutto bene andiamo a visualizzare la mappa
										directionsRenderer.setMap(mapID) //gli passiamo la mappa
										directionsRenderer.setRouteIndex(0) //vogliamo visualizzare la prima
										directionsRenderer.setDirections(directionsRoutes)
										$("#panel").children("div").eq(0).remove();

										directionsRenderer.setPanel($("#panel").get(0)) // pannello con le indicazioni stradali
										//$("<i>").addClass("bi bi-x").insertBefore($("#panel").children("div").eq(0))

									}
								});
								promise.catch(function () {
									console.log("Errore nella promise");
								})

							})

						});
					})

				}
			}
		}
	}
}





function caricaGoogleMaps() {
	const URL = "https://maps.googleapis.com/maps/api"
	let requestKey = inviaRichiesta("GET", "/api/getKey");
	requestKey.fail(errore);
	requestKey.done((data) => {
		console.log(data);
		MAP_KEY = data.key;
		let promise = new Promise(function (resolve, reject) {
			let script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = URL + '/js?&key=' + MAP_KEY + '&v=3&libraries=marker&callback=documentReady';
			document.body.appendChild(script);
			script.onload = resolve;
			script.onerror = reject;
		})
		return promise;
	})
}



