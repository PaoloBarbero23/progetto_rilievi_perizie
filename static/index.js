"use strict"

//stringa con mail dell'utente corrente
let mail_current_user = "";
const map_icon = "M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"
let total_markers = [];
const markerColor = "FF3333";
let lastWindow = null;
let index;

//funzione che viene eseguita quando la pagina carica
window.onload = async function () {

	await caricaGoogleMaps();


	//parti del progetto
	const _wrapper = $("#wrapper");
	const div_user = $("#div_user");
	const div_filtro = $("#div_filtro");
	const divMappa = $("#divMappa");
	const divPerizie = $("#divPerizie");

	//sezione utente
	const _btnAddUser = $("#btnAddUser");
	const _modalUser = $("#modalUser");
	const _userDettagli = $("#userDettagli");

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

	//divInfo
	const div_info = $("#div_info");
	const user_perizia = $("#user_perizia");
	const txtInfoUser = $("#txtInfoUser");
	const txtInfoPerizia = $("#txtInfoPerizia");
	const _btnClose = $("#btnClose");

	//divFiltro
	const dataListUtenti = $("#dataListUtenti");
	const dataListOptions = $("#datalistOptions");

	//sezioni navbar
	const btnUtenti = $("#btnUtenti");


	div_info.hide();





	//inizializzo tooltip bootstrap
	var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
	var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
		return new bootstrap.Tooltip(tooltipTriggerEl)
	})

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
			let mapID = new google.maps.Map(_map, mapOptions);
			let position = new google.maps.LatLng(result[0].geometry.location)
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
			let infoWindow = new google.maps.InfoWindow(infoWindowOption);

			marker.addListener("click", function () {
				//console.log(marcatori);
				//console.log(ristoranti.length % ristorante.id);
				infoWindow.open(mapID, marker);
			})

			let requestMarker = inviaRichiesta("POST", "/api/showUtenti");
			requestMarker.fail(errore);
			requestMarker.done((data) => {
				popolaDataList(data);
				console.log(data);
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
							marker.addListener("click", function () {
								if (lastWindow)
									lastWindow.close();
								lastWindow = infoWindow;
								infoWindow.open(mapID, this);
								google.maps.event.addListener(infoWindow, "domready", function () {
									let link = $(".link");
									link.on("click", function () {
										
										console.log($(this))
										let id_perizia = $(this).attr("id_perizia");
										let mail = $(this).attr("mail");
										let id_marker = $(this).attr("id");
										console.log(id_perizia);
										div_info.show();
										_btnImportant.prop({ id_perizia, mail, id_marker, "full_color": item.color });
										//inserimeto dati sulla perizia
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

										$("<p>").appendTo(txtInfoPerizia).html("<b>Nome perizia:</b> " + perizia.nome).addClass("content")
										$("<p>").appendTo(txtInfoPerizia).html("Perizia effettuata il giorno " + perizia.data.split("T")[0]).addClass("content")
										$("<p>").appendTo(txtInfoPerizia).html("alle ore " + perizia.data.split("T")[1]).addClass("content")
										$("<p>").appendTo(txtInfoPerizia).html("<b>Descrizione:</b> " + perizia.descrizione).css({
											"font-size": "1.2em",
											"margin-top": "1em",
											"margin-bottom": "1em"

										})
										index = 0;
										
										let max_length = 0;
										$("#img").prop("perizie", perizia);
										$("#img").children("img").remove();
										console.log(perizia)
										if (perizia.immagini) {
											max_length = perizia.immagini.length;
											
											let img_carousel = $("<img>").attr("src", perizia.immagini[index].img_url);
											img_carousel.appendTo($("#img"))

										}
										
										console.log(max_length)
										
										if (max_length > 1) {
											$(".carousel-control-prev").show()
											$(".carousel-control-next").show();

										}
										else {
											$(".carousel-control-prev").hide()
											$(".carousel-control-next").hide();
										}
										//inserimento immagini nel carousel




									});

									let percorso = $(".percorso");
									percorso.on("click", function () {
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
												zIndex: 100 // posizionamento (quella con zIndex più alto verra visualizzata)
											}
										}
										let directionsRenderer = new google.maps.DirectionsRenderer(rendererOptions);

										let promise = directionsService.route(routesOptions)
										promise.then(function (directionsRoutes) {
											let mapOptions = {};
											let mappa = new google.maps.Map(map, mapOptions); //lo zoom lo calcola da solo
											if (directionsRoutes.status == google.maps.DirectionsStatus.OK) {
												console.log(directionsRoutes.routes[0]);
												//se è andato tutto bene andiamo a visualizzare la mappa
												directionsRenderer.setMap(mappa) //gli passiamo la mappa
												directionsRenderer.setRouteIndex(0) //vogliamo visualizzare la prima
												directionsRenderer.setDirections(directionsRoutes)
												$("#panel").html("");
												directionsRenderer.setPanel($("#panel").get(0)) // pannello con le indicazioni stradali


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

	$(".carousel-control-prev").on("click", function () {
		let perizia = $(this).parent().prop("perizie")
		let max_length = perizia.immagini.length;
		if (index <= 0) {
			index = max_length;
		}
		index--;
		$("#img").children("img").remove();
		let img_carousel = $("<img>").attr("src", perizia.immagini[index].img_url);
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
		let img_carousel = $("<img>").attr("src", perizia.immagini[index].img_url);
		img_carousel.appendTo($("#img"))
		$("#img").children("img").css("animation", "fadeIn 1s")
		setTimeout(function () {
			$("#img").children("img").css("animation", "none")
		}, 1000)
	})

	

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
			console.log(parseInt((id_marker).split("_")[1]))
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
			console.log(marker)
			//cambio colore del bordo del marker
			marker.setIcon(svgMarker);
			console.log(marker)




		});
	});

	_btnClose.on("click", function () {
		div_info.hide();
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
		let formData = new FormData();
		formData.append("mail", txtEmailNew.val());
		formData.append("password", txtPwdNew.val() == "" ? "password" : txtPwdNew.val());
		if ($("#txtImgNew").prop("files")[0])
			formData.append("img", $("#txtImgNew").prop("files")[0]);
		if ($("#txtUsernameNew").val() != "")
			formData.append("username", $("#txtUsernameNew").val());
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
					$("<i>").addClass("bi bi-person-circle dettagliUser").appendTo(btn)
					btn.on("click", visualizzaDettagli);
				}
			}
		})
	}

	_btnSalvaDettagli.on("click", function () {
		let param = {};
		param.mail = _txtEmailDettagli.val();
		param.color = _txtColorDettagli.val();
		let request = inviaRichiesta("POST", "/api/updateUser", param);
		request.fail(errore);
		request.done((data) => {
			$("#btnChiudiDettagli").trigger("click");
			inserisciUtenti();
		})

	});

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

	function caricaGoogleMaps() {
		const URL = "https://maps.googleapis.com/maps/api"
		let promise = new Promise(function (resolve, reject) {
			let script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = URL + '/js?&key=' + MAP_KEY + '&v=3&libraries=marker';
			document.body.appendChild(script);
			script.onload = resolve;
			script.onerror = reject;
		})
		return promise;
	}


	function popolaDataList(data) {
		dataListOptions.empty();
		for (const utente of data) {
			if (utente.username)
				$("<option>").val(utente.username).appendTo(dataListOptions);
		}
		for (const utente of data) {
			$("<option>").val(utente.mail).appendTo(dataListOptions);
		}
	}






}