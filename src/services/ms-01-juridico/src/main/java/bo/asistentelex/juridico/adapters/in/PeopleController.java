package bo.asistentelex.juridico.adapters.in;

import org.springframework.web.bind.annotation.*;
import bo.asistentelex.juridico.application.PeopleService;
import bo.asistentelex.juridico.domain.People.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/people")
public class PeopleController {
	private final PeopleService service;
	public PeopleController(PeopleService service) { this.service = service; }
	@ModelAttribute
	void noStore(HttpServletResponse response) { response.setHeader("Cache-Control", "no-store"); }
	@GetMapping
	Page<Person> list(@RequestParam(required = false) String name, @RequestParam(required = false) String type,
			@RequestParam(required = false) String document, @RequestParam(defaultValue = "25") int first,
			@RequestParam(required = false) String after, HttpServletRequest request) {
		return service.list(AdministrationController.actor(request), new Filter(name, type, document), first, after);
	}
	@GetMapping("/selections")
	Page<Selection> selections(@RequestParam(required = false) String name, @RequestParam(required = false) String type,
			@RequestParam(required = false) String document, @RequestParam(defaultValue = "25") int first,
			@RequestParam(required = false) String after, HttpServletRequest request) {
		return service.selections(AdministrationController.actor(request), new Filter(name, type, document), first, after);
	}
	@GetMapping("/{id}")
	Person get(@PathVariable String id, HttpServletRequest request) { return service.get(AdministrationController.actor(request), id); }
	@GetMapping("/{id}/selection")
	Selection selection(@PathVariable String id, HttpServletRequest request) { return service.get(AdministrationController.actor(request), id).selection(); }
	@PostMapping
	Person create(@RequestBody Input input, HttpServletRequest request) { return service.create(AdministrationController.actor(request), input); }
	@PutMapping("/{id}")
	Person update(@PathVariable String id, @RequestBody Input input, HttpServletRequest request) { return service.update(AdministrationController.actor(request), id, input); }
}